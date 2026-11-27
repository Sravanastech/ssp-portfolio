import type { BlockData, BlockSchema } from "@/api/studioApi";
import { same } from "./model";
import { TEXT_LABELS } from "./outline";

function show(v: unknown): string {
  if (v === undefined || v === null || v === "") return "(empty)";
  if (Array.isArray(v))
    return v.length
      ? v
          .map((x) =>
            typeof x === "object" && x
              ? Object.values(x as object).join(" · ")
              : String(x),
          )
          .join(", ")
      : "(empty)";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export type FieldDiff = {
  key: string;
  label: string;
  before: string;
  after: string;
};

export function diffFields(
  before: BlockData | null | undefined,
  after: BlockData | null | undefined,
  schema?: BlockSchema,
): FieldDiff[] {
  const b = before ?? {};
  const a = after ?? {};
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  return keys
    .filter((k) => k !== "id" && !same(b[k], a[k]))
    .map((k) => ({
      key: k,
      label:
        schema?.properties?.[k]?.["x-ui"]?.label ?? TEXT_LABELS[k]?.label ?? k,
      before: show(b[k]),
      after: show(a[k]),
    }));
}

export default function Diff({ fields }: { fields: FieldDiff[] }) {
  if (!fields.length) return <p className="page-small">No field changes.</p>;
  return (
    <dl className="studio-diff">
      {fields.map((f) => (
        <div key={f.key} className="studio-diff-row">
          <dt>{f.label}</dt>
          <dd>
            <del>
              <span className="sr-only">Before: </span>
              {f.before}
            </del>
            <ins>
              <span className="sr-only">After: </span>
              {f.after}
            </ins>
          </dd>
        </div>
      ))}
    </dl>
  );
}
