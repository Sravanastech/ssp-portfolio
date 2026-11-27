import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Eye, Loader2, Rocket } from "lucide-react";
import { studioApi } from "@/api/studioApi";
import { useAdmin } from "@/admin/AdminContext";
import CollectionEditor from "./CollectionEditor";
import ErrorSummary from "./ErrorSummary";
import HistoryDrawer from "./HistoryDrawer";
import {
  buildOutline,
  findSection,
  PAGES,
  sectionPath,
  type Section,
} from "./outline";
import PreviewPane from "./PreviewPane";
import { ReleaseStrip, ReleasesDrawer } from "./ReleaseUi";
import ReviewDialog from "./ReviewDialog";
import SaveBar from "./SaveBar";
import {
  sectionDirty,
  sectionPending,
  SingletonEditor,
  TextEditor,
} from "./SectionEditors";
import { useReleases } from "./useReleases";
import { useStudio } from "./useStudio";
import "@/styles/studio.css";

const ROUTE = /^\/admin\/content(?:\/([^/]+)\/([^/]+))?\/?$/;

/** Site Studio: outline of pages and sections, generic forms, save bar, publish flow, preview. */
export default function StudioPage() {
  const { me, getToken, refreshSummary } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const canPublish = me.permissions.includes("content.publish");
  const studio = useStudio(getToken);
  const releases = useReleases(getToken);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [releasesOpen, setReleasesOpen] = useState(false);
  const [history, setHistory] = useState<{ id: string; title: string }>();
  const [preview, setPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>>();
  const [previewError, setPreviewError] = useState(false);
  const [live, setLive] = useState("");
  const { reload } = studio;

  useEffect(() => {
    void reload();
  }, [reload]);

  const outline = useMemo(() => buildOutline(studio.schemas), [studio.schemas]);
  const m = ROUTE.exec(location.pathname);
  const section = findSection(outline, m?.[1], m?.[2]);

  // Draft preview: refetched when opened and after each save/restore.
  const { saveSeq, blocks } = studio;
  const pendingSig = blocks.map((b) => `${b.id}:${b.version}`).join();
  useEffect(() => {
    if (!preview) return;
    let alive = true;
    (async () => {
      try {
        const r = await studioApi.preview(await getToken());
        if (alive) {
          setPreviewData(r.content);
          setPreviewError(false);
        }
      } catch {
        if (alive) setPreviewError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [preview, saveSeq, pendingSig, getToken]);

  // Leave guard: reload/close tab and in-app links away from the studio.
  const dirty = studio.dirtyCount > 0;
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || a.closest("[data-studio-root]")) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") || a.getAttribute("target") === "_blank")
        return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const openHistory = useCallback(
    (id: string, title: string) => setHistory({ id, title }),
    [],
  );

  if (studio.load.phase === "loading")
    return (
      <p role="status" className="ops-loading">
        <Loader2 className="ops-spinner" size={18} aria-hidden="true" />
        Loading the studio…
      </p>
    );
  if (studio.load.phase === "error")
    return (
      <div role="alert" className="page-notice page-notice--error">
        <AlertCircle size={20} aria-hidden="true" />
        <span>{studio.load.message}</span>
        <button
          type="button"
          className="studio-button-secondary"
          onClick={() => void studio.reload()}
        >
          Try again
        </button>
      </div>
    );
  if (!m) return <Navigate to="/admin/content" replace />;
  if (!section) {
    const first = outline[0];
    return first ? (
      <Navigate to={sectionPath(first)} replace />
    ) : (
      <p>Nothing to edit yet.</p>
    );
  }

  const pageSections = outline.filter((s) => s.page === section.page);
  const schema = section.type ? studio.schemaOf(section.type) : undefined;
  const dot = (s: Section) => sectionDirty(studio, s);
  const pagePending = (page: string) =>
    outline
      .filter((s) => s.page === page)
      .some((s) => sectionDirty(studio, s) || sectionPending(studio, s));

  function goFromSummary(key: string, path: string) {
    const type =
      studio.blocks.find((b) => b.id === key)?.type ??
      studio.edits.newBlocks[key]?.type;
    const target =
      outline.find((s) => s.type && s.type === type) ??
      outline.find((s) => s.keys?.includes(path));
    if (target && target.id !== section?.id) navigate(sectionPath(target));
    const id = `f-${key}-${path.replace(/\./g, "-")}`;
    window.setTimeout(() => document.getElementById(id)?.focus(), 80);
  }

  return (
    <div className="studio-root" data-studio-root>
      <header className="admin-head">
        <h1 className="admin-title">Studio</h1>
        <p className="page-small">
          Edit the site page by page. Save keeps your edits as a draft; publish
          puts saved drafts live.
        </p>
      </header>

      {!canPublish && (
        <p className="page-notice studio-banner" role="note">
          <CheckCircle2 size={20} aria-hidden="true" />
          <span>Owner publishes your changes. You can edit and save.</span>
        </p>
      )}
      {studio.notice && (
        <p
          role={studio.notice.kind === "error" ? "alert" : "status"}
          className={`page-notice${studio.notice.kind === "error" ? " page-notice--error" : ""}`}
        >
          <span>{studio.notice.text}</span>
        </p>
      )}
      <ReleaseStrip
        release={releases.releases[0]}
        canPublish={canPublish}
        onRetry={(id) => {
          void (async () => {
            try {
              await studioApi.rollback(await getToken(), id);
              void releases.refresh();
            } catch (e) {
              studio.setNotice({
                kind: "error",
                text: e instanceof Error ? e.message : "Retry failed.",
              });
            }
          })();
        }}
      />

      <div className="studio-topbar">
        <nav aria-label="Pages" className="studio-pages">
          {PAGES.map((p) => {
            const first = outline.find((s) => s.page === p);
            if (!first) return null;
            return (
              <Link
                key={p}
                to={sectionPath(first)}
                className="studio-page-tab"
                aria-current={p === section.page ? "page" : undefined}
              >
                {p}
                {pagePending(p) && (
                  <span
                    className="studio-dot"
                    role="img"
                    aria-label="has changes"
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="studio-select-wrap">
          <label className="sr-only" htmlFor="studio-section-select">
            Go to section
          </label>
          <select
            id="studio-section-select"
            className="field-input studio-select"
            value={sectionPath(section)}
            onChange={(e) => navigate(e.target.value)}
          >
            {PAGES.map((p) => (
              <optgroup key={p} label={p}>
                {outline
                  .filter((s) => s.page === p)
                  .map((s) => (
                    <option key={sectionPath(s)} value={sectionPath(s)}>
                      {s.label}
                      {dot(s) ? " ●" : ""}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="studio-top-actions">
          <button
            type="button"
            className="studio-button-secondary"
            aria-pressed={preview}
            onClick={() => setPreview((v) => !v)}
          >
            <Eye size={16} aria-hidden="true" /> Preview
          </button>
          <button
            type="button"
            className="studio-button-secondary"
            onClick={() => setReleasesOpen(true)}
          >
            <Rocket size={16} aria-hidden="true" /> Releases
          </button>
        </div>
      </div>

      <div
        className={`studio-layout${preview ? " studio-layout--preview" : ""}`}
      >
        <nav aria-label={`${section.page} sections`} className="studio-outline">
          <p className="admin-nav-heading">{section.page}</p>
          <ul>
            {pageSections.map((s) => (
              <li key={s.id}>
                <Link
                  to={sectionPath(s)}
                  className="admin-nav-link"
                  aria-current={s.id === section.id ? "page" : undefined}
                >
                  {s.label}
                  {dot(s) && (
                    <span
                      className="studio-dot"
                      role="img"
                      aria-label="unsaved changes"
                    />
                  )}
                  {!dot(s) && sectionPending(studio, s) && (
                    <span
                      className="studio-dot studio-dot--pending"
                      role="img"
                      aria-label="saved, not live"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="studio-editor">
          <ErrorSummary studio={studio} onPick={goFromSummary} />
          <p id="studio-live" role="status" className="sr-only">
            {live}
          </p>
          {section.keys ? (
            <TextEditor
              studio={studio}
              section={section}
              onHistory={openHistory}
            />
          ) : schema && schema["x-studio"].shape === "object" ? (
            <SingletonEditor
              studio={studio}
              schema={schema}
              onHistory={openHistory}
            />
          ) : schema ? (
            <CollectionEditor
              key={schema["x-studio"].type}
              studio={studio}
              schema={schema}
              fixed={schema["x-studio"].shape !== "item"}
              onHistory={openHistory}
              announce={setLive}
            />
          ) : null}
        </div>

        {preview && (
          <PreviewPane
            page={section.page}
            content={previewData}
            error={previewError}
          />
        )}
      </div>

      <SaveBar
        studio={studio}
        canPublish={canPublish}
        onPublish={() => setReviewOpen(true)}
      />

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        studio={studio}
        getToken={getToken}
        onPublished={() => {
          setReviewOpen(false);
          void studio.refreshBlocks();
          void releases.refresh();
          refreshSummary?.();
          studio.setNotice({ kind: "ok", text: "Publishing started." });
        }}
      />
      <ReleasesDrawer
        open={releasesOpen}
        onOpenChange={setReleasesOpen}
        releases={releases.releases}
        canPublish={canPublish}
        getToken={getToken}
        onDone={() => {
          setReleasesOpen(false);
          void releases.refresh();
        }}
      />
      <HistoryDrawer
        target={history}
        onClose={() => setHistory(undefined)}
        studio={studio}
        getToken={getToken}
      />
    </div>
  );
}
