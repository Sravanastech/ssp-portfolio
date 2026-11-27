import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import type { SchemaProp } from "@/api/studioApi";
import { emptyFor, validate } from "./model";

export type FormCtx = {
  /** Unique DOM prefix (block key) so ids never clash between cards. */
  idBase: string;
  errors: Record<string, string>;
  setError: (path: string, message: string | undefined) => void;
};

export const fieldId = (idBase: string, path: string) =>
  `f-${idBase}-${path.replace(/\./g, "-")}`;

type Props = {
  schema: SchemaProp;
  value: unknown;
  onChange: (v: unknown) => void;
  path: string;
  ctx: FormCtx;
  required: boolean;
  /** Overrides the schema label (page-text keys use the label map). */
  label?: string;
};

const asText = (v: unknown) => (v === undefined || v === null ? "" : String(v));

/** Generic renderer: one component per schema property, chosen by `x-ui.widget` and `type`. */
export default function Field(props: Props) {
  const { schema, value, onChange, path, ctx, required } = props;
  const ui = schema["x-ui"] ?? {};
  const widget =
    ui.widget ??
    (schema.enum
      ? "select"
      : schema.type === "boolean"
        ? "boolean"
        : schema.type === "array"
          ? "stringList"
          : "text");
  if (widget === "hidden") return null;
  const label = props.label ?? ui.label ?? path;
  const id = fieldId(ctx.idBase, path);
  const error = ctx.errors[path];
  const helpId = `${id}-help`;
  const errId = `${id}-err`;
  const describedBy =
    [ui.help ? helpId : "", error ? errId : ""].filter(Boolean).join(" ") ||
    undefined;
  const check = (v: unknown) =>
    ctx.setError(path, validate(schema, v, path, {}, required)[path]);

  const head = (htmlFor: string | undefined, asLegend = false) => {
    const content = (
      <>
        {label}
        {required && (
          <span className="field-req" aria-hidden="true">
            {" "}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </>
    );
    return asLegend ? (
      <legend className="field-label">{content}</legend>
    ) : (
      <label className="field-label" htmlFor={htmlFor}>
        {content}
      </label>
    );
  };
  const foot = (counter?: string) => (
    <>
      {ui.help && (
        <p id={helpId} className="field-hint">
          {ui.help}
        </p>
      )}
      {counter && (
        <p className="field-hint studio-counter" aria-hidden="true">
          {counter}
        </p>
      )}
      {error && (
        <p id={errId} className="field-error">
          {error}
        </p>
      )}
    </>
  );

  if (widget === "boolean")
    return (
      <div className="field">
        <label className="admin-check">
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            aria-describedby={describedBy}
          />
          <span>{label}</span>
        </label>
        {foot()}
      </div>
    );

  if (widget === "select")
    return (
      <div className="field">
        {head(id)}
        <select
          id={id}
          className="field-input"
          value={asText(value)}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => check(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        >
          <option value="">Choose…</option>
          {(schema.enum ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {foot()}
      </div>
    );

  if (widget === "tags")
    return (
      <TagsField
        {...props}
        label={label}
        id={id}
        head={head(id)}
        foot={foot()}
        describedBy={describedBy}
        check={check}
      />
    );

  if (widget === "stringList" || widget === "objectList")
    return (
      <ListField
        {...props}
        label={label}
        id={id}
        head={head(undefined, true)}
        foot={foot()}
        objects={widget === "objectList"}
      />
    );

  if (schema.type === "object" && schema.properties)
    return (
      <fieldset className="field studio-group">
        {head(undefined, true)}
        {Object.entries(schema.properties).map(([k, sub]) => (
          <Field
            key={k}
            schema={sub}
            value={(value as Record<string, unknown> | undefined)?.[k]}
            onChange={(v) => onChange({ ...((value as object) ?? {}), [k]: v })}
            path={`${path}.${k}`}
            ctx={ctx}
            required={(schema.required ?? []).includes(k)}
          />
        ))}
      </fieldset>
    );

  const text = asText(value);
  const multi = widget === "textarea";
  const common = {
    id,
    className: "field-input",
    value: text,
    onBlur: () => check(value),
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    placeholder: ui.placeholder,
    maxLength: undefined,
  };
  const counter =
    schema.maxLength !== undefined
      ? `${text.length} / ${schema.maxLength}`
      : undefined;
  return (
    <div className="field">
      {head(id)}
      {multi ? (
        <textarea
          {...common}
          rows={Math.min(10, Math.max(3, Math.ceil(text.length / 70)))}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          {...common}
          type={
            widget === "email"
              ? "email"
              : widget === "number"
                ? "text"
                : widget === "url"
                  ? "url"
                  : "text"
          }
          inputMode={widget === "number" ? "numeric" : undefined}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {foot(counter)}
    </div>
  );
}

function TagsField({
  schema,
  value,
  onChange,
  ctx,
  path,
  id,
  head,
  foot,
  describedBy,
  label,
}: Props & {
  id: string;
  head: React.ReactNode;
  foot: React.ReactNode;
  describedBy?: string;
  check: (v: unknown) => void;
}) {
  const tags = Array.isArray(value) ? (value as string[]) : [];
  const [draft, setDraft] = useState("");
  const item = schema["x-ui"]?.itemLabel ?? "item";
  const limit = schema.items?.maxLength;
  const commit = () => {
    const t = draft.trim();
    if (!t) return;
    if (limit && t.length > limit) {
      ctx.setError(
        path,
        `Each ${item.toLowerCase()} must be at most ${limit} characters.`,
      );
      return;
    }
    if (schema.maxItems !== undefined && tags.length >= schema.maxItems) {
      ctx.setError(path, `At most ${schema.maxItems} items.`);
      return;
    }
    ctx.setError(path, undefined);
    if (!tags.includes(t)) onChange([...tags, t]);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    }
  };
  return (
    <div className="field" role="group" aria-label={label}>
      {head}
      <ul className="studio-tags" aria-label={`${label}, current`}>
        {tags.map((t, i) => (
          <li key={`${t}-${i}`} className="studio-tag">
            <span>{t}</span>
            <button
              type="button"
              className="studio-icon-btn studio-icon-btn--sm"
              aria-label={`Remove ${t}`}
              onClick={() => onChange(tags.filter((_, j) => j !== i))}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="studio-tag-entry">
        <input
          id={id}
          className="field-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          placeholder={`Add ${item.toLowerCase()}…`}
          aria-describedby={describedBy}
          aria-invalid={ctx.errors[path] ? true : undefined}
          autoComplete="off"
        />
        <button
          type="button"
          className="studio-button-secondary"
          onClick={commit}
        >
          Add
        </button>
      </div>
      {foot}
    </div>
  );
}

function ListField({
  schema,
  value,
  onChange,
  ctx,
  path,
  head,
  foot,
  label,
  objects,
  id,
}: Props & {
  id: string;
  head: React.ReactNode;
  foot: React.ReactNode;
  objects: boolean;
}) {
  const rows = Array.isArray(value) ? (value as unknown[]) : [];
  const itemSchema = schema.items ?? { type: "string" };
  const full = schema.maxItems !== undefined && rows.length >= schema.maxItems;
  const itemLabel = schema["x-ui"]?.itemLabel ?? "Item";
  return (
    <fieldset className="field studio-group" id={id}>
      {head}
      <ol className="studio-rows">
        {rows.map((row, i) => (
          <li key={i} className="studio-row">
            <div className="studio-row-body">
              {objects ? (
                Object.entries(itemSchema.properties ?? {}).map(([k, sub]) => (
                  <Field
                    key={k}
                    schema={sub}
                    value={(row as Record<string, unknown>)?.[k]}
                    onChange={(v) =>
                      onChange(
                        rows.map((r, j) =>
                          j === i ? { ...(r as object), [k]: v } : r,
                        ),
                      )
                    }
                    path={`${path}.${i}.${k}`}
                    ctx={ctx}
                    required={(itemSchema.required ?? []).includes(k)}
                    label={`${label} ${i + 1}: ${sub["x-ui"]?.label ?? k}`}
                  />
                ))
              ) : (
                <Field
                  schema={{
                    ...itemSchema,
                    "x-ui": { widget: "text", label: `${label} ${i + 1}` },
                  }}
                  value={row}
                  onChange={(v) =>
                    onChange(rows.map((r, j) => (j === i ? v : r)))
                  }
                  path={`${path}.${i}`}
                  ctx={ctx}
                  required
                />
              )}
            </div>
            <button
              type="button"
              className="studio-icon-btn"
              aria-label={`Remove ${label} ${i + 1}`}
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="studio-button-secondary studio-add-row"
        disabled={full}
        onClick={() => onChange([...rows, emptyFor(itemSchema)])}
      >
        <Plus size={16} aria-hidden="true" /> Add {itemLabel.toLowerCase()}
      </button>
      {foot}
    </fieldset>
  );
}
