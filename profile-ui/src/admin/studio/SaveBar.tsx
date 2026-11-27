import type { StudioModel } from "./useStudio";

export default function SaveBar({
  studio,
  canPublish,
  onPublish,
}: {
  studio: StudioModel;
  canPublish: boolean;
  onPublish: () => void;
}) {
  const n = studio.dirtyCount;
  const p = studio.pendingCount;
  return (
    <div className="studio-bar" role="region" aria-label="Save and publish">
      <div className="studio-bar-group">
        <p className="studio-bar-state" aria-live="polite">
          {n > 0 ? (
            <>
              <span className="studio-dot" aria-hidden="true" />
              {n} unsaved {n === 1 ? "change" : "changes"}
            </>
          ) : (
            "No unsaved changes"
          )}
        </p>
        <button
          type="button"
          className="studio-button-secondary"
          disabled={n === 0 || studio.saving}
          onClick={() => {
            if (window.confirm("Discard all unsaved changes?"))
              void studio.discard();
          }}
        >
          Discard
        </button>
        <button
          type="button"
          className="studio-button"
          disabled={n === 0 || studio.saving}
          onClick={() => void studio.save()}
        >
          {studio.saving ? "Saving…" : "Save"}
        </button>
      </div>
      <div className="studio-bar-group studio-bar-group--live">
        <p className="studio-bar-state">
          {p} {p === 1 ? "change" : "changes"} not live
        </p>
        <button
          type="button"
          className="studio-button-secondary"
          disabled={p === 0 || !canPublish}
          title={canPublish ? undefined : "Only the owner can publish"}
          onClick={onPublish}
        >
          Publish…
        </button>
      </div>
    </div>
  );
}
