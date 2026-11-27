import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/auth";
import { Info } from "lucide-react";
import { adminRequest } from "@/api/accountApi";
import { useAdmin } from "@/admin/AdminContext";
import Forbidden from "@/admin/Forbidden";
import "@/styles/pages.css";

type Draft = { id: number; version: number; content: Record<string, unknown> };
export default function ContentPage() {
  const { getAccessTokenSilently } = useAuth();
  const { me } = useAdmin();
  const canEdit = me.permissions.includes("content.edit");
  const canPublish = me.permissions.includes("content.publish");
  const [draft, setDraft] = useState<Draft>();
  const [source, setSource] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    setNotice("");
    try {
      const token = await getAccessTokenSilently();
      const drafts = await adminRequest<Draft[]>(token, "/drafts");
      const latest =
        drafts[0] ?? (await adminRequest<Draft>(token, "/drafts", "POST"));
      setDraft(latest);
      setSource(JSON.stringify(latest.content, null, 2));
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not load the editor.",
      );
    } finally {
      setBusy(false);
    }
  }, [getAccessTokenSilently]);
  useEffect(() => {
    if (canEdit) void load();
  }, [canEdit, load]);
  async function save() {
    if (!draft) return;
    setBusy(true);
    setNotice("");
    try {
      const content: unknown = JSON.parse(source);
      const token = await getAccessTokenSilently();
      const updated = await adminRequest<Draft>(
        token,
        `/drafts/${draft.id}`,
        "PUT",
        { version: draft.version, content },
      );
      setDraft(updated);
      setSource(JSON.stringify(updated.content, null, 2));
      setNotice("Draft saved.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Draft could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (
      !draft ||
      !window.confirm("Publish this saved draft to the public portfolio?")
    )
      return;
    setBusy(true);
    setNotice("");
    try {
      const token = await getAccessTokenSilently();
      await adminRequest(token, `/drafts/${draft.id}/publish`, "POST", {
        version: draft.version,
      });
      setNotice(
        "Publication queued. The current public version stays live until rendering succeeds.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Publication could not be queued.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-section-wrap">
      <div className="studio-container">
        <header className="admin-head">
          <h1 className="admin-title">Content</h1>
          <p className="page-small">
            Edit all public portfolio content as structured JSON: profile,
            career history, case studies, expertise, page copy, navigation, and
            search metadata. The server validates fields and saves a versioned
            draft.
          </p>
        </header>
        {!canEdit && <Forbidden />}
        {notice && (
          <p role="status" aria-live="polite" className="page-notice">
            <Info size={20} aria-hidden="true" />
            <span>{notice}</span>
          </p>
        )}
        {canEdit && (
          <div className="ops-stack">
            {draft && (
              <p className="page-small admin-mono">
                Draft {draft.id} · version {draft.version}
              </p>
            )}
            <div className="field">
              <label className="field-label" htmlFor="site-content">
                Complete site content
              </label>
              <textarea
                id="site-content"
                className="field-input field-input--code"
                spellCheck={false}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                aria-describedby="editor-help"
              />
              <p id="editor-help" className="field-hint">
                Save creates a new version. Stale edits return a conflict;
                reload the newest server copy before continuing.
              </p>
            </div>
            <div className="ops-actions">
              <div className="page-actions">
                <button
                  className="studio-button"
                  disabled={busy || !draft}
                  onClick={() => void save()}
                >
                  {busy ? "Saving…" : "Save draft"}
                </button>
                {canPublish && (
                  <button
                    className="studio-button-secondary"
                    disabled={busy || !draft}
                    onClick={() => void publish()}
                  >
                    Publish saved draft
                  </button>
                )}
                <button
                  className="studio-button-secondary"
                  disabled={busy}
                  onClick={() => void load()}
                >
                  Reload latest
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
