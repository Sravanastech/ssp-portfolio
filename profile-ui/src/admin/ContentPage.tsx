import { useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useAdmin } from "@/admin/AdminContext";
import Forbidden from "@/admin/Forbidden";
import "@/styles/pages.css";

const StudioPage = lazy(() => import("@/admin/studio/StudioPage"));
const ContentRawPage = lazy(() => import("@/admin/ContentRawPage"));

/** /admin/content/*: the Studio. /admin/content/raw keeps the old JSON editor for owners. */
export default function ContentPage() {
  const { me } = useAdmin();
  const { pathname } = useLocation();
  const canEdit = me.permissions.includes("content.edit");
  const raw = /^\/admin\/content\/raw\/?$/.test(pathname);
  return (
    <div className="admin-section-wrap">
      <div className="studio-container">
        {!canEdit ? (
          <>
            <header className="admin-head">
              <h1 className="admin-title">Content</h1>
            </header>
            <Forbidden />
          </>
        ) : (
          <Suspense
            fallback={
              <p role="status" className="ops-loading">
                Loading…
              </p>
            }
          >
            {raw ? (
              me.role === "owner" ? (
                <ContentRawPage />
              ) : (
                <Forbidden />
              )
            ) : (
              <StudioPage />
            )}
          </Suspense>
        )}
      </div>
    </div>
  );
}
