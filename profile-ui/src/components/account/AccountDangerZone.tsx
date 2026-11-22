import { Trash2 } from "lucide-react";

interface AccountDangerZoneProps {
  deleting: boolean;
  confirmDelete: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

export function AccountDangerZone({
  deleting,
  confirmDelete,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: AccountDangerZoneProps) {
  return (
    <section
      className="page-panel page-panel--danger ops-danger-zone"
      aria-labelledby="danger-title"
    >
      <div className="ops-danger">
        <div>
          <h2 className="panel-title" id="danger-title">
            <Trash2 size={20} aria-hidden="true" />
            Delete Portfolio Profile
          </h2>
          <p className="field-hint">
            Removes your personal contact and address details stored in the
            portfolio database. Your sign-in identity with Auth0 remains active.
          </p>
        </div>
        {confirmDelete ? (
          <div className="page-actions">
            <button
              type="button"
              disabled={deleting}
              onClick={onConfirmDelete}
              className="studio-button studio-button--danger studio-button--sm"
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={onCancelDelete}
              className="studio-button-secondary studio-button--sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={deleting}
            onClick={onRequestDelete}
            className="studio-button-secondary studio-button--sm"
          >
            Delete profile data
          </button>
        )}
      </div>
    </section>
  );
}
