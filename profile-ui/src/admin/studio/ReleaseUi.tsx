import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { studioApi, type Release } from "@/api/studioApi";

const LABEL: Record<Release["status"], string> = {
  queued: "Queued",
  building: "Building",
  live: "Live",
  failed: "Failed",
  superseded: "Replaced by a newer release",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

/** Status of the newest release: Queued, Building, Live or Failed (with run link and retry). */
export function ReleaseStrip({
  release,
  canPublish,
  onRetry,
}: {
  release?: Release;
  canPublish: boolean;
  onRetry: (id: number) => void;
}) {
  if (!release) return null;
  const busy = release.status === "queued" || release.status === "building";
  return (
    <div
      className={`studio-strip studio-strip--${release.status}`}
      role="status"
      aria-live="polite"
    >
      {busy && <Loader2 className="ops-spinner" size={16} aria-hidden="true" />}
      {release.status === "live" && (
        <CheckCircle2 size={16} aria-hidden="true" />
      )}
      {release.status === "failed" && <XCircle size={16} aria-hidden="true" />}
      <span>
        Release #{release.id}: <strong>{LABEL[release.status]}</strong>
        {release.status === "live" && " — the site shows these changes."}
        {busy && " — the site updates in a few minutes."}
      </span>
      {release.status === "live" && (
        <a href="/" target="_blank" rel="noreferrer">
          View site
        </a>
      )}
      {release.runUrl && (
        <a href={release.runUrl} target="_blank" rel="noreferrer">
          Build log
        </a>
      )}
      {release.status === "failed" && canPublish && (
        <button
          type="button"
          className="studio-button-secondary"
          onClick={() => onRetry(release.id)}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function ReleasesDrawer({
  open,
  onOpenChange,
  releases,
  canPublish,
  getToken,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  releases: Release[];
  canPublish: boolean;
  getToken: () => Promise<string>;
  onDone: () => void;
}) {
  const [confirm, setConfirm] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function roll(id: number) {
    setBusy(true);
    setError("");
    try {
      await studioApi.rollback(await getToken(), id);
      setConfirm(undefined);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Roll back failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ops-dialog-overlay" />
        <Dialog.Content className="studio-drawer" aria-describedby={undefined}>
          <Dialog.Title className="panel-title">Releases</Dialog.Title>
          <p className="page-small">
            The last 3 releases. Rolling back publishes an older version again;
            your saved edits stay as they are.
          </p>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          {releases.length === 0 && (
            <p className="page-small">No releases yet.</p>
          )}
          <ol className="studio-rev-list">
            {releases.map((r, i) => (
              <li key={r.id} className="studio-rev">
                <p>
                  <strong>Release #{r.id}</strong> · {LABEL[r.status]}
                  {i === 0 && " (newest)"}
                </p>
                <p className="page-small">
                  {when(r.createdAt)}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
                {r.runUrl && (
                  <a href={r.runUrl} target="_blank" rel="noreferrer">
                    Build log
                  </a>
                )}
                {canPublish && i > 0 && (
                  <div className="page-actions">
                    {confirm === r.id ? (
                      <>
                        <button
                          type="button"
                          className="studio-button"
                          disabled={busy}
                          onClick={() => void roll(r.id)}
                        >
                          {busy
                            ? "Rolling back…"
                            : `Confirm roll back to #${r.id}`}
                        </button>
                        <button
                          type="button"
                          className="studio-button-secondary"
                          onClick={() => setConfirm(undefined)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="studio-button-secondary"
                        onClick={() => setConfirm(r.id)}
                      >
                        Roll back to this
                      </button>
                    )}
                  </div>
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
