import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Layout from "./Layout";
import { scheduleIdlePrefetch } from "@/lib/routePrefetch";
import { notifyRouteCommitted } from "@/lib/viewTransition";

export function PageSkeleton() {
  return (
    <div className="studio-page page-skeleton" aria-busy="true">
      <div className="studio-container studio-page-intro">
        <p role="status" className="sr-only">
          Loading page…
        </p>
        <span className="skeleton-bar skeleton-bar--title" aria-hidden="true" />
        <span className="skeleton-bar skeleton-bar--line" aria-hidden="true" />
        <span className="skeleton-bar skeleton-bar--line" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Layout route: one persistent shell; only the Outlet suspends. */
export default function LayoutRoute() {
  const { pathname, hash } = useLocation();
  const first = useRef(true);
  useEffect(() => scheduleIdlePrefetch(), []);
  useLayoutEffect(() => {
    notifyRouteCommitted();
  }, [pathname]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Hash navigation keeps its anchor behavior; otherwise move focus without scrolling.
    if (hash) return;
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pathname, hash]);
  return (
    <Layout>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
}
