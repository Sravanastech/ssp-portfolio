import { useCallback, useMemo, useRef, useState } from "react";
import {
  StudioApiError,
  studioApi,
  type BlockData,
  type BlockSchema,
  type StudioBlock,
} from "@/api/studioApi";
import {
  buildChanges,
  dataOf,
  emptyBlock,
  listItems,
  NO_EDITS,
  normalize,
  pathFromServer,
  same,
  validate,
  type Edits,
} from "./model";

export type FieldErrors = Record<string, Record<string, string>>;
export type StudioLoad =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready" };

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "00000000-0000-4000-8000-" +
      Math.random().toString(16).slice(2, 14).padEnd(12, "0");

/** All Studio state: server blocks, browser-only edits, errors, conflicts and the actions on them. */
export function useStudio(getToken: () => Promise<string>) {
  const [load, setLoad] = useState<StudioLoad>({ phase: "loading" });
  const [blocks, setBlocks] = useState<StudioBlock[]>([]);
  const [schemas, setSchemas] = useState<BlockSchema[]>([]);
  const [edits, setEdits] = useState<Edits>(NO_EDITS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "ok" | "error";
    text: string;
  }>();
  const [saveSeq, setSaveSeq] = useState(0);
  const editsRef = useRef(edits);
  editsRef.current = edits;

  const schemaOf = useCallback(
    (type: string) => schemas.find((s) => s["x-studio"].type === type),
    [schemas],
  );

  const fetchAll = useCallback(async () => {
    const t = await getToken();
    return studioApi.load(t);
  }, [getToken]);

  const reload = useCallback(async () => {
    setLoad({ phase: "loading" });
    try {
      const s = await fetchAll();
      setBlocks(s.blocks);
      setSchemas(s.schemas);
      setEdits(NO_EDITS);
      setErrors({});
      setConflicts([]);
      setLoad({ phase: "ready" });
    } catch (e) {
      setLoad({
        phase: "error",
        message: e instanceof Error ? e.message : "Could not load the studio.",
      });
    }
  }, [fetchAll]);

  const built = useMemo(() => buildChanges(blocks, edits), [blocks, edits]);
  const dirtyKeys = useMemo(() => new Set(built.keys), [built]);
  // Content edits, adds and removals; a pure position shift is not "an edit" of that item.
  const contentKeys = useMemo(
    () =>
      new Set(
        built.keys.filter((_, i) => {
          const c = built.changes[i];
          return c.draft !== undefined || c.delete || c.type !== undefined;
        }),
      ),
    [built],
  );
  const dirtyCount = useMemo(() => {
    const moved = built.changes.filter(
      (c) => c.draft === undefined && !c.delete && c.type === undefined,
    ).length;
    return contentKeys.size + (moved > 0 ? 1 : 0);
  }, [built, contentKeys]);
  const pendingCount = useMemo(
    () => blocks.filter((b) => b.pending).length,
    [blocks],
  );

  /** Replace the stored draft of one block/item; drops the edit again when it equals the server copy. */
  const setData = useCallback(
    (key: string, data: BlockData) => {
      setEdits((e) => {
        const drafts = { ...e.drafts, [key]: data };
        const b = blocks.find((x) => x.id === key);
        if (b && same(data, b.draft ?? b.published ?? {})) delete drafts[key];
        return { ...e, drafts };
      });
    },
    [blocks],
  );

  const add = useCallback(
    (type: string, init?: BlockData) => {
      const schema = schemaOf(type);
      if (!schema) return "";
      const key = uid();
      setEdits((e) => {
        const current = listItems(blocks, e, type).map((i) => i.key);
        return {
          ...e,
          newBlocks: { ...e.newBlocks, [key]: { type } },
          drafts: { ...e.drafts, [key]: init ?? emptyBlock(schema) },
          order: { ...e.order, [type]: [key, ...current] },
        };
      });
      return key;
    },
    [blocks, schemaOf],
  );

  const duplicate = useCallback(
    (type: string, from: string) => {
      const src = dataOf(blocks, editsRef.current, from);
      const copy = JSON.parse(JSON.stringify(src)) as BlockData;
      delete copy.id;
      for (const f of ["title", "name", "label", "domain"])
        if (typeof copy[f] === "string") {
          copy[f] = `${copy[f] as string} (copy)`;
          break;
        }
      const key = uid();
      setEdits((e) => {
        const current = listItems(blocks, e, type).map((i) => i.key);
        const at = current.indexOf(from);
        current.splice(at + 1, 0, key);
        return {
          ...e,
          newBlocks: { ...e.newBlocks, [key]: { type } },
          drafts: { ...e.drafts, [key]: copy },
          order: { ...e.order, [type]: current },
        };
      });
      return key;
    },
    [blocks],
  );

  const move = useCallback(
    (type: string, key: string, dir: -1 | 1) => {
      setEdits((e) => {
        const current = listItems(blocks, e, type).map((i) => i.key);
        const i = current.indexOf(key);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= current.length) return e;
        [current[i], current[j]] = [current[j], current[i]];
        return { ...e, order: { ...e.order, [type]: current } };
      });
    },
    [blocks],
  );

  const remove = useCallback((key: string) => {
    setEdits((e) => ({ ...e, deleted: { ...e.deleted, [key]: true } }));
  }, []);
  const undoRemove = useCallback((key: string) => {
    setEdits((e) => {
      const deleted = { ...e.deleted };
      delete deleted[key];
      return { ...e, deleted };
    });
  }, []);

  const validateKey = useCallback(
    (key: string, type: string): Record<string, string> => {
      const schema = schemaOf(type);
      if (!schema) return {};
      return validate(schema, dataOf(blocks, editsRef.current, key));
    },
    [blocks, schemaOf],
  );

  const setFieldError = useCallback(
    (key: string, path: string, message: string | undefined) =>
      setErrors((all) => {
        const cur = { ...(all[key] ?? {}) };
        if (message) cur[path] = message;
        else delete cur[path];
        return { ...all, [key]: cur };
      }),
    [],
  );

  const typeOfKey = useCallback(
    (key: string) =>
      blocks.find((b) => b.id === key)?.type ??
      editsRef.current.newBlocks[key]?.type ??
      "",
    [blocks],
  );

  const save = useCallback(async (): Promise<boolean> => {
    const e = editsRef.current;
    const { changes, keys } = buildChanges(blocks, e);
    if (!changes.length) return true;
    // Client-side check first; focusable summary lists everything wrong.
    const bad: FieldErrors = {};
    keys.forEach((k, i) => {
      if (changes[i].delete) return;
      if (!changes[i].draft) return;
      const type = typeOfKey(k);
      const found = validateKey(k, type);
      if (Object.keys(found).length) bad[k] = found;
    });
    if (Object.keys(bad).length) {
      setErrors(bad);
      setNotice({ kind: "error", text: "Fix the highlighted fields to save." });
      return false;
    }
    setSaving(true);
    setNotice(undefined);
    setConflicts([]);
    try {
      const payload = changes.map((c) => {
        if (!c.draft) return c;
        const schema = schemaOf(typeOfKey(c.id ?? ""));
        return {
          ...c,
          draft: schema ? (normalize(schema, c.draft) as BlockData) : c.draft,
        };
      });
      const t = await getToken();
      const res = await studioApi.save(t, payload);
      setBlocks((cur) => {
        const next = cur.filter((b) => !res.removed.includes(b.id));
        for (const nb of res.blocks) {
          const i = next.findIndex((b) => b.id === nb.id);
          if (i >= 0) next[i] = nb;
          else next.push(nb);
        }
        return next;
      });
      setEdits(NO_EDITS);
      setErrors({});
      setSaveSeq((n) => n + 1);
      setNotice({
        kind: "ok",
        text: "Saved. Changes are not live until you publish.",
      });
      return true;
    } catch (err) {
      if (err instanceof StudioApiError && err.code === "block_conflict") {
        setConflicts(err.ids);
        setNotice({
          kind: "error",
          text: "Some items changed since you opened them. Nothing was saved.",
        });
      } else if (
        err instanceof StudioApiError &&
        err.code === "validation_failed"
      ) {
        const next: FieldErrors = {};
        for (const issue of err.errors) {
          const key =
            issue.id ??
            (issue.index !== undefined ? keys[issue.index] : undefined);
          if (!key) continue;
          (next[key] ??= {})[pathFromServer(issue.path)] = issue.message;
        }
        setErrors(next);
        setNotice({ kind: "error", text: "The server rejected some fields." });
      } else {
        setNotice({
          kind: "error",
          text: err instanceof Error ? err.message : "Could not save.",
        });
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [blocks, getToken, schemaOf, typeOfKey, validateKey]);

  /** Fetch fresh server blocks. keepEdits=true keeps my unsaved edits ("overwrite with mine"). */
  const refreshAfterConflict = useCallback(
    async (keepEdits: boolean, ids: string[]) => {
      try {
        const s = await fetchAll();
        setBlocks(s.blocks);
        setSchemas(s.schemas);
        if (!keepEdits)
          setEdits((e) => {
            const drafts = { ...e.drafts };
            const deleted = { ...e.deleted };
            for (const id of ids) {
              delete drafts[id];
              delete deleted[id];
            }
            return { ...e, drafts, deleted };
          });
        setConflicts((c) => c.filter((x) => !ids.includes(x)));
      } catch (err) {
        setNotice({
          kind: "error",
          text: err instanceof Error ? err.message : "Could not reload.",
        });
      }
    },
    [fetchAll],
  );

  /** Refetch server blocks (after publish) while keeping unsaved edits. */
  const refreshBlocks = useCallback(async () => {
    try {
      const s = await fetchAll();
      setBlocks(s.blocks);
    } catch {
      /* the next action reports connection problems */
    }
  }, [fetchAll]);

  const discard = useCallback(async () => {
    setEdits(NO_EDITS);
    setErrors({});
    setConflicts([]);
    setNotice(undefined);
  }, []);

  /** Server-side state changes (restore, publish) feed back here. */
  const applyBlocks = useCallback((updated: StudioBlock[]) => {
    setBlocks((cur) => {
      const next = [...cur];
      for (const nb of updated) {
        const i = next.findIndex((b) => b.id === nb.id);
        if (i >= 0) next[i] = nb;
        else next.push(nb);
      }
      return next;
    });
    setEdits((e) => {
      const drafts = { ...e.drafts };
      for (const b of updated) delete drafts[b.id];
      return { ...e, drafts };
    });
  }, []);

  return {
    load,
    blocks,
    schemas,
    schemaOf,
    edits,
    errors,
    conflicts,
    saving,
    notice,
    setNotice,
    saveSeq,
    dirtyKeys,
    contentKeys,
    dirtyCount,
    changes: built.changes,
    pendingCount,
    reload,
    setData,
    add,
    duplicate,
    move,
    remove,
    undoRemove,
    save,
    discard,
    setFieldError,
    validateKey,
    refreshAfterConflict,
    applyBlocks,
    refreshBlocks,
    setErrors,
  };
}

export type StudioModel = ReturnType<typeof useStudio>;
