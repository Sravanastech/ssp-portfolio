import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { studioApi, type Revision } from "@/api/studioApi";
import Diff, { diffFields } from "./Diff";
import { dataOf } from "./model";
import type { StudioModel } from "./useStudio";

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

/** Up to 3 revisions of one block; compare with what is on screen, restore into the draft. */
export default function HistoryDrawer({
  target,
  onClose,
  studio,
  getToken,
}: {
  target?: { id: string; title: string };
  onClose: () => void;
  studio: StudioModel;
  getToken: () => Promise<string>;
}) {
  const [revs, setRevs] = useState<Revision[]>();
  const [error, setError] = useState("");
  const [compare, setCompare] = useState<number>();
  const [busy, setBusy] = useState(false);
  const id = target?.id;
  useEffect(() => {
    if (!id) return;
    let live = true;
    setRevs(undefined);
    setCompare(undefined);
    setError("");
    (async () => {
      try {
        const h = await studioApi.history(await getToken(), id);
        if (live) setRevs(h.revisions);
      } catch (e) {
        if (live)
          setError(e instanceof Error ? e.message : "Could not load history.");
      }
    })();
    return () => {
      live = false;
    };
  }, [id, getToken]);

  async function restore(rev: number) {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const b = await studioApi.restore(await getToken(), id, rev);
      studio.applyBlocks([b]);
      studio.setNotice({
        kind: "ok",
        text: `Restored version ${rev} into the draft. Publish to make it live.`,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not restore.");
    } finally {
      setBusy(false);
    }
  }

  const block = studio.blocks.find((b) => b.id === id);
  const schema = block && studio.schemaOf(block.type);
  const current = id ? dataOf(studio.blocks, studio.edits, id) : {};
  return (
    <Dialog.Root open={!!target} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="ops-dialog-overlay" />
        <Dialog.Content className="studio-drawer" aria-describedby={undefined}>
          <Dialog.Title className="panel-title">
            History: {target?.title}
          </Dialog.Title>
          <p className="page-small">
            The live version and up to two earlier published versions.
          </p>
          {!revs && !error && (
            <p role="status" className="ops-loading">
              <Loader2 className="ops-spinner" size={18} aria-hidden="true" />
              Loading…
            </p>
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          {revs && revs.length === 0 && (
            <p className="page-small">This item has not been published yet.</p>
          )}
          <ol className="studio-rev-list">
            {revs?.map((r, i) => (
              <li key={r.rev} className="studio-rev">
                <p>
                  <strong>Version {r.rev}</strong>
                  {i === 0 && " (live)"} · {when(r.createdAt)}
                </p>
                <div className="page-actions">
                  <button
                    type="button"
                    className="studio-button-secondary"
                    aria-expanded={compare === r.rev}
                    onClick={() =>
                      setCompare(compare === r.rev ? undefined : r.rev)
                    }
                  >
                    {compare === r.rev
                      ? "Hide changes"
                      : "Compare with current"}
                  </button>
                  <button
                    type="button"
                    className="studio-button-secondary"
                    disabled={busy}
                    onClick={() => void restore(r.rev)}
                  >
                    Restore to draft
                  </button>
                </div>
                {compare === r.rev && (
                  <Diff fields={diffFields(r.data, current, schema)} />
                )}
              </li>
            ))}
          </ol>
          <Dialog.Close className="studio-button-secondary">Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
