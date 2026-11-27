import { lazy, Suspense, useEffect, useRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { SnapshotProvider } from "@/content/SiteContent";
import type { SiteContent } from "@/content/siteContentContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { previewRoute, type PageName } from "./outline";

const Home = lazy(() => import("@/pages/HomePage"));
const About = lazy(() => import("@/pages/AboutPage"));
const Work = lazy(() => import("@/pages/WorkPage"));
const Contact = lazy(() => import("@/pages/ContactPage"));
const PAGE = { Home, About, Work, Contact, Global: Home };

/** The real public page, rendered with the assembled draft content. Read-only. */
export default function PreviewPane({
  page,
  content,
  error,
}: {
  page: PageName;
  content?: Record<string, unknown>;
  error: boolean;
}) {
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    body.current?.setAttribute("inert", "");
  }, [content, page]);
  const Page = PAGE[page];
  return (
    <aside
      className="studio-preview"
      aria-label={`Preview of the ${page} page`}
    >
      <p className="studio-preview-head">
        Preview · saved draft{page === "Global" ? " (home page)" : ""}
      </p>
      {error && (
        <p role="alert" className="field-error">
          Could not load the preview.
        </p>
      )}
      {!content && !error && <p role="status">Loading preview…</p>}
      {content && (
        <div ref={body} className="studio-preview-body">
          <ErrorBoundary>
            <SnapshotProvider content={content as unknown as SiteContent}>
              <MemoryRouter initialEntries={[previewRoute(page)]}>
                <Suspense fallback={<p role="status">Loading preview…</p>}>
                  <Page />
                </Suspense>
              </MemoryRouter>
            </SnapshotProvider>
          </ErrorBoundary>
        </div>
      )}
    </aside>
  );
}
