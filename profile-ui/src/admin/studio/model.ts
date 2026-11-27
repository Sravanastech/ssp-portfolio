import type {
  BlockData,
  BlockSchema,
  SaveChange,
  SchemaProp,
  StudioBlock,
} from "@/api/studioApi";

/** Unsaved, browser-only edits. Keys are block ids (server) or temp ids (new items). */
export type Edits = {
  drafts: Record<string, BlockData>;
  newBlocks: Record<string, { type: string; slug?: string }>;
  deleted: Record<string, true>;
  order: Record<string, string[]>;
};
export const NO_EDITS: Edits = {
  drafts: {},
  newBlocks: {},
  deleted: {},
  order: {},
};

export const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

export const baseData = (b: StudioBlock): BlockData =>
  b.draft ?? b.published ?? {};

export type Item = { key: string; isNew: boolean; block?: StudioBlock };

export function listItems(
  blocks: StudioBlock[],
  edits: Edits,
  type: string,
  includeDeleted = false,
): Item[] {
  const server = blocks
    .filter((b) => b.type === type && !b.draftDeleted)
    .sort((a, b) => a.position - b.position);
  const byKey = new Map<string, Item>();
  for (const b of server)
    byKey.set(b.id, { key: b.id, isNew: false, block: b });
  for (const [k, n] of Object.entries(edits.newBlocks))
    if (n.type === type) byKey.set(k, { key: k, isNew: true });
  const ordered: string[] = [];
  for (const k of edits.order[type] ?? []) if (byKey.has(k)) ordered.push(k);
  for (const k of byKey.keys()) if (!ordered.includes(k)) ordered.push(k);
  return ordered
    .filter((k) => includeDeleted || !edits.deleted[k])
    .map((k) => byKey.get(k)!);
}

export function dataOf(
  blocks: StudioBlock[],
  edits: Edits,
  key: string,
): BlockData {
  if (edits.drafts[key]) return edits.drafts[key];
  const b = blocks.find((x) => x.id === key);
  return b ? baseData(b) : {};
}

export type Built = { changes: SaveChange[]; keys: string[] };

/** Only what differs from the server: one change per dirty block, explicit positions for moved ones. */
export function buildChanges(blocks: StudioBlock[], edits: Edits): Built {
  const map = new Map<string, SaveChange>();
  for (const b of blocks) {
    if (edits.deleted[b.id]) {
      map.set(b.id, { id: b.id, version: b.version, delete: true });
      continue;
    }
    const d = edits.drafts[b.id];
    if (d && !same(d, baseData(b)))
      map.set(b.id, { id: b.id, version: b.version, draft: d });
  }
  for (const [k, n] of Object.entries(edits.newBlocks)) {
    if (edits.deleted[k]) continue;
    map.set(k, {
      id: k,
      type: n.type,
      ...(n.slug ? { slug: n.slug } : {}),
      draft: edits.drafts[k] ?? {},
    });
  }
  for (const type of Object.keys(edits.order)) {
    listItems(blocks, edits, type).forEach((it, i) => {
      if (it.isNew) {
        const c = map.get(it.key);
        if (c) c.position = i;
      } else if (it.block && it.block.position !== i) {
        const c = map.get(it.key) ?? { id: it.key, version: it.block.version };
        c.position = i;
        map.set(it.key, c);
      }
    });
  }
  return { changes: [...map.values()], keys: [...map.keys()] };
}

export function fillTemplate(tpl: string | undefined, data: BlockData) {
  if (!tpl) return "";
  return tpl
    .replace(/\{\{(\w+)\}\}/g, (_, f: string) => {
      const v = data[f];
      return typeof v === "string" || typeof v === "number" ? String(v) : "";
    })
    .replace(/^[\s·]+|[\s·]+$/g, "")
    .replace(/\s+·\s+·\s+/g, " · ");
}

/** Blank value for a schema property. */
export function emptyFor(p: SchemaProp): unknown {
  if (p.type === "array") return [];
  if (p.type === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(p.properties ?? {})) o[k] = emptyFor(v);
    return o;
  }
  if (p.type === "boolean") return false;
  return "";
}

export function emptyBlock(schema: BlockSchema): BlockData {
  return emptyFor(schema) as BlockData;
}

/** Client-side mirror of the schema rules, keyed by dotted path ("outcomes.0.label"). */
export function validate(
  p: SchemaProp,
  value: unknown,
  path = "",
  out: Record<string, string> = {},
  required = true,
): Record<string, string> {
  const label = p["x-ui"]?.label ?? "This field";
  const set = (m: string) => {
    out[path] = m;
  };
  if (p.type === "object" && p.properties) {
    const obj = (value ?? {}) as Record<string, unknown>;
    for (const [k, sub] of Object.entries(p.properties))
      validate(
        sub,
        obj[k],
        path ? `${path}.${k}` : k,
        out,
        (p.required ?? []).includes(k),
      );
    return out;
  }
  if (p.type === "array") {
    const arr = Array.isArray(value) ? value : [];
    if (p.maxItems !== undefined && arr.length > p.maxItems)
      set(`${label}: at most ${p.maxItems} items.`);
    if (p.items)
      arr.forEach((v, i) => validate(p.items!, v, `${path}.${i}`, out, true));
    return out;
  }
  const empty = value === undefined || value === null || value === "";
  if (empty) {
    if (required && p["x-ui"]?.widget !== "hidden")
      set(`${label} is required.`);
    return out;
  }
  if (p.type === "integer" || p.type === "number") {
    const n = Number(value);
    if (!Number.isFinite(n) || (p.type === "integer" && !Number.isInteger(n)))
      set(`${label} must be a whole number.`);
    else if (p.minimum !== undefined && n < p.minimum)
      set(`${label} must be at least ${p.minimum}.`);
    else if (p.maximum !== undefined && n > p.maximum)
      set(`${label} must be at most ${p.maximum}.`);
    return out;
  }
  if (typeof value === "string") {
    if (p.minLength !== undefined && value.length < p.minLength)
      set(`${label} is too short.`);
    else if (p.maxLength !== undefined && value.length > p.maxLength)
      set(`${label} must be at most ${p.maxLength} characters.`);
    else if (p.pattern && !new RegExp(p.pattern).test(value))
      set(`${label} is not in the expected format.`);
    else if (p.enum && !p.enum.includes(value))
      set(`${label} must be one of the listed options.`);
  }
  return out;
}

/** Coerce integer fields (held as strings while typing) before sending. */
export function normalize(p: SchemaProp, value: unknown): unknown {
  if (
    p.type === "object" &&
    p.properties &&
    value &&
    typeof value === "object"
  ) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>))
      out[k] = p.properties[k] ? normalize(p.properties[k], v) : v;
    return out;
  }
  if (p.type === "array" && Array.isArray(value) && p.items)
    return value.map((v) => normalize(p.items!, v));
  if ((p.type === "integer" || p.type === "number") && value !== "")
    return Number(value);
  return value;
}

/** Server path "$.outcomes[0].label" becomes "outcomes.0.label". */
export function pathFromServer(p: string): string {
  return p
    .replace(/^\$\.?/, "")
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/^\./, "");
}
