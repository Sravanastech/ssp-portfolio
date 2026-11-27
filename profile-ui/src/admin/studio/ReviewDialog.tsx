import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { StudioApiError, studioApi, type Release } from "@/api/studioApi";
import Diff, { diffFields } from "./Diff";
import { fillTemplate } from "./model";
import type { StudioModel } from "./useStudio";

export default function ReviewDialog({
  open,
  onOpenChange,
  studio,
  getToken,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  studio: StudioModel;
  getToken: () => Promise<string>;
  onPublished: (r: Release) => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = studio.blocks.filter((b) => b.pending);

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const r = await studioApi.publish(
        await getToken(),
        note.trim() || undefined,
      );
      setNote("");
      onPublished(r);
    } catch (e) {
      setError(
        e instanceof StudioApiError && e.code === "nothing_to_publish"
          ? "There is nothing to publish."
          : e instanceof StudioApiError && e.code === "validation_failed"
            ? "Some saved content is no longer valid. Open the item and fix it first."
            : e instanceof Error
              ? e.message
              : "Publishing failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ops-dialog-overlay" />
        <Dialog.Content
          className="ops-dialog studio-review"
          aria-describedby="review-desc"
        >
          <Dialog.Title className="panel-title">
            Review before publishing
          </Dialog.Title>
          <p id="review-desc" className="page-small">
            {pending.length} saved {pending.length === 1 ? "change" : "changes"}{" "}
            will go live together.
            {studio.dirtyCount > 0 &&
              " Unsaved edits on this page are not included."}
          </p>
          <ul className="studio-review-list">
            {pending.map((b) => {
              const schema = studio.schemaOf(b.type);
              const live = b.published;
              const next = b.draft ?? b.published;
              const isText = b.type === "page_text";
              const title = isText
                ? `Page text · ${b.slug}`
                : fillTemplate(schema?.["x-studio"].itemTitle, next ?? {}) ||
                  schema?.title ||
                  b.slug;
              const kind = b.draftDeleted
                ? "Removed"
                : !live
                  ? "New"
                  : b.draft
                    ? "Edited"
                    : "Moved";
              const fields =
                kind === "Edited" || kind === "New"
                  ? diffFields(live, b.draft, schema)
                  : [];
              return (
                <li key={b.id} className="studio-review-item">
                  <p>
                    <span className="studio-pill">{kind}</span>{" "}
                    <strong>{title}</strong>
                    <span className="page-small">
                      {" "}
                      ·{" "}
                      {schema?.["x-studio"].section ?? schema?.title ?? b.type}
                    </span>
                  </p>
                  {kind === "Removed" && (
                    <p className="page-small">Will be deleted from the site.</p>
                  )}
                  {kind === "Moved" && (
                    <p className="page-small">Position changed.</p>
                  )}
                  {fields.length > 0 && <Diff fields={fields} />}
                </li>
              );
            })}
          </ul>
          <div className="field">
            <label className="field-label" htmlFor="release-note">
              Note (optional)
            </label>
            <input
              id="release-note"
              className="field-input"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed, for the release history"
            />
            <p className="field-hint studio-counter" aria-hidden="true">
              {note.length} / 200
            </p>
          </div>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="page-actions">
            <button
              type="button"
              className="studio-button"
              disabled={busy || pending.length === 0}
              onClick={() => void confirm()}
            >
              {busy ? "Publishing…" : "Publish to the site"}
            </button>
            <Dialog.Close className="studio-button-secondary">
              Cancel
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
