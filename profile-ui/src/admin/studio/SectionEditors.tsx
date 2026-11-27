import { History } from "lucide-react";
import type { BlockSchema, SchemaProp } from "@/api/studioApi";
import BlockForm, { useFormCtx } from "./BlockForm";
import Field from "./Field";
import { baseData, dataOf, listItems, same } from "./model";
import { TEXT_LABELS, textBlockSlug, type Section } from "./outline";
import type { StudioModel } from "./useStudio";

const TEXT_PROP: SchemaProp = {
  type: "string",
  maxLength: 2000,
  "x-ui": { widget: "textarea" },
};

function textBlock(studio: StudioModel, key: string) {
  const slug = textBlockSlug(key);
  return studio.blocks.find((b) => b.type === "page_text" && b.slug === slug);
}

/** True when the section holds unsaved edits (drives the dot in the outline). */
export function sectionDirty(studio: StudioModel, s: Section): boolean {
  if (s.keys) {
    return s.keys.some((k) => {
      const b = textBlock(studio, k);
      const draft = b && studio.edits.drafts[b.id];
      return !!draft && !same(draft[k], baseData(b)[k]);
    });
  }
  if (!s.type) return false;
  const inType = (key: string) =>
    studio.blocks.find((b) => b.id === key)?.type === s.type ||
    studio.edits.newBlocks[key]?.type === s.type;
  return [...studio.dirtyKeys].some(inType);
}

/** Whether any saved-but-unpublished block exists in the section. */
export function sectionPending(studio: StudioModel, s: Section): boolean {
  if (s.keys) return s.keys.some((k) => !!textBlock(studio, k)?.pending);
  return studio.blocks.some((b) => b.type === s.type && b.pending);
}

export function SingletonEditor({
  studio,
  schema,
  onHistory,
}: {
  studio: StudioModel;
  schema: BlockSchema;
  onHistory: (id: string, title: string) => void;
}) {
  const type = schema["x-studio"].type;
  const block = listItems(studio.blocks, studio.edits, type)[0];
  if (!block)
    return <p className="page-small">This section has no content yet.</p>;
  const conflict = studio.conflicts.includes(block.key);
  return (
    <section aria-label={schema.title}>
      <div className="studio-section-head">
        <h2 className="panel-title">{schema["x-studio"].section}</h2>
        {block.block && (
          <button
            type="button"
            className="studio-button-secondary"
            onClick={() => onHistory(block.key, schema.title ?? type)}
          >
            <History size={16} aria-hidden="true" /> History
          </button>
        )}
      </div>
      {conflict && (
        <div
          role="alert"
          className="page-notice page-notice--error studio-conflict"
        >
          <span>This was changed by someone else since you opened it.</span>
          <div className="page-actions">
            <button
              type="button"
              className="studio-button-secondary"
              onClick={() =>
                void studio.refreshAfterConflict(false, [block.key])
              }
            >
              Load their version
            </button>
            <button
              type="button"
              className="studio-button-secondary"
              onClick={() =>
                void studio.refreshAfterConflict(true, [block.key])
              }
            >
              Keep mine
            </button>
          </div>
        </div>
      )}
      <BlockForm
        studio={studio}
        schema={schema}
        blockKey={block.key}
        data={dataOf(studio.blocks, studio.edits, block.key)}
      />
    </section>
  );
}

export function TextEditor({
  studio,
  section,
  onHistory,
}: {
  studio: StudioModel;
  section: Section;
  onHistory: (id: string, title: string) => void;
}) {
  const keys = section.keys ?? [];
  const blockIds = [
    ...new Set(keys.map((k) => textBlock(studio, k)?.id).filter(Boolean)),
  ] as string[];
  return (
    <section aria-label={section.label}>
      <div className="studio-section-head">
        <h2 className="panel-title">{section.label}</h2>
        {blockIds.length === 1 && (
          <button
            type="button"
            className="studio-button-secondary"
            onClick={() => onHistory(blockIds[0], section.label)}
          >
            <History size={16} aria-hidden="true" /> History
          </button>
        )}
      </div>
      <p className="page-small">
        Short pieces of text shown on the page. Some sentences are split in
        parts around links or numbers, so keep the spacing as it is.
      </p>
      <div className="studio-form">
        {keys.map((k) => {
          const b = textBlock(studio, k);
          if (!b) return null;
          return <TextRow key={k} studio={studio} blockId={b.id} textKey={k} />;
        })}
      </div>
    </section>
  );
}

function TextRow({
  studio,
  blockId,
  textKey,
}: {
  studio: StudioModel;
  blockId: string;
  textKey: string;
}) {
  const ctx = useFormCtx(studio, blockId);
  const data = dataOf(studio.blocks, studio.edits, blockId);
  return (
    <Field
      schema={TEXT_PROP}
      label={TEXT_LABELS[textKey]?.label ?? textKey}
      value={data[textKey]}
      onChange={(v) => studio.setData(blockId, { ...data, [textKey]: v })}
      path={textKey}
      ctx={ctx}
      required={false}
    />
  );
}
