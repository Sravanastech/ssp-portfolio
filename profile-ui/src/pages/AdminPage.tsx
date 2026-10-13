import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { accountRequest, adminRequest, type Account } from "@/api/accountApi";

type Draft = { id: number; version: number; content: Record<string, unknown> };
export default function AdminPage() {
  const { getAccessTokenSilently, user } = useAuth0();
  const [draft, setDraft] = useState<Draft>();
  const [source, setSource] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [allowed, setAllowed] = useState<boolean>();
  const load = useCallback(async () => {
    setBusy(true);
    setNotice("");
    try {
      const token = await getAccessTokenSilently();
      const who = await accountRequest<Account>(token, "POST", {
        firstName: user?.given_name ?? "",
        lastName: user?.family_name ?? "",
      });
      setAllowed(who.admin);
      if (!who.admin) return;
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
  }, [getAccessTokenSilently, user]);
  useEffect(() => {
    void load();
  }, [load]);
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
    <main className="studio-container studio-page">
      <p>
        <Link className="studio-link" to="/account">
          ← Your account
        </Link>
      </p>
      <h1 className="studio-page-heading">Portfolio editor</h1>
      <p className="studio-lede max-w-3xl">
        Edit all public portfolio content as structured JSON: profile, career
        history, case studies, expertise, page copy, navigation, and search
        metadata. The server validates fields and saves a versioned draft.
      </p>
      {allowed === false && (
        <p role="alert" className="mt-6">
          This account does not have owner access.
        </p>
      )}
      {notice && (
        <p role="status" aria-live="polite" className="my-5 rounded border p-4">
          {notice}
        </p>
      )}
      {allowed && (
        <>
          <p className="my-4">
            <Link className="studio-link" to="/admin/inquiries">
              Open private contact inbox
            </Link>
          </p>
          {draft && (
            <p className="my-4">
              Draft {draft.id} · version {draft.version}
            </p>
          )}
          <label className="grid gap-2 font-medium" htmlFor="site-content">
            Complete site content
          </label>
          <textarea
            id="site-content"
            className="mt-2 min-h-[65vh] w-full rounded border p-4 font-mono text-sm leading-6"
            spellCheck={false}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            aria-describedby="editor-help"
          />
          <p id="editor-help" className="mt-2 text-sm">
            Save creates a new version. Stale edits return a conflict; reload
            the newest server copy before continuing.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="studio-button"
              disabled={busy || !draft}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Save draft"}
            </button>
            <button
              className="studio-button"
              disabled={busy || !draft}
              onClick={() => void publish()}
            >
              Publish saved draft
            </button>
            <button
              className="rounded border px-4 py-2"
              disabled={busy}
              onClick={() => void load()}
            >
              Reload latest
            </button>
          </div>
        </>
      )}
      {allowed === undefined && busy && (
        <p role="status">Loading owner access…</p>
      )}
    </main>
  );
}
