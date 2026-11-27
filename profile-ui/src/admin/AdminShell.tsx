import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { useAuth } from "@/auth/auth";
import {
  adminFetch,
  AdminApiError,
  type AdminMe,
  type AdminSummary,
} from "@/api/adminApi";
import {
  AdminContext,
  type AdminContextValue,
  type SummaryState,
} from "./AdminContext";
import CommandPalette from "./CommandPalette";
import { adminLoginOptions } from "./adminLogin";
import { visibleItems, visibleNav } from "./permissions";
import "@/styles/pages.css";
import "@/styles/admin.css";
import "@/styles/admin-console.css";

type State =
  | { phase: "loading" }
  | { phase: "ready"; value: Pick<AdminContextValue, "me" | "getToken"> }
  | { phase: "error"; error: AdminApiError | Error };

const SUMMARY_TTL_MS = 30_000;

/** Layout route for /admin: resolves the caller's role once, gates access, renders the nav. */
export default function AdminShell() {
  const { getAccessTokenSilently, loginWithRedirect } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  const getToken = useCallback(
    async (): Promise<string> => getAccessTokenSilently(),
    [getAccessTokenSilently],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const me = await adminFetch<AdminMe>(token, "/me");
        if (!cancelled) setState({ phase: "ready", value: { me, getToken } });
      } catch (error) {
        if (!cancelled)
          setState({
            phase: "error",
            error: error instanceof Error ? error : new Error("Failed"),
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, attempt]);

  const [summary, setSummary] = useState<SummaryState>({ status: "loading" });
  const lastSummaryAt = useRef(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const ready = state.phase === "ready" ? state.value : null;

  const loadSummary = useCallback(
    async (force: boolean) => {
      const now = Date.now();
      if (!force && now - lastSummaryAt.current < SUMMARY_TTL_MS) return;
      lastSummaryAt.current = now;
      try {
        const token = await getToken();
        const data = await adminFetch<AdminSummary>(token, "/summary");
        setSummary({ status: "ready", data });
      } catch {
        lastSummaryAt.current = 0;
        setSummary({ status: "error" });
      }
    },
    [getToken],
  );

  // Refetch on route change, at most once per 30 s.
  useEffect(() => {
    if (ready) void loadSummary(false);
  }, [ready, location.pathname, loadSummary]);

  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready]);

  const nav = useMemo(
    () => (ready ? visibleNav(ready.me.permissions) : []),
    [ready],
  );
  const paletteItems = useMemo(
    () => (ready ? visibleItems(ready.me.permissions) : []),
    [ready],
  );
  const context = useMemo<AdminContextValue | null>(
    () =>
      ready
        ? {
            ...ready,
            summary,
            refreshSummary: () => void loadSummary(true),
          }
        : null,
    [ready, summary, loadSummary],
  );

  if (state.phase === "loading") {
    return (
      <div className="studio-page ops-page admin-shell">
        <div className="studio-container admin-section">
          <p role="status" className="ops-loading">
            <Loader2 className="ops-spinner" size={18} aria-hidden="true" />
            Checking admin access…
          </p>
        </div>
      </div>
    );
  }

  if (state.phase === "error") {
    const { error } = state;
    const code = error instanceof AdminApiError ? error.code : undefined;
    return (
      <div className="studio-page ops-page admin-shell">
        <div className="studio-container admin-section">
          <div role="alert" className="page-notice page-notice--error">
            <AlertCircle size={20} aria-hidden="true" />
            <span>
              {error instanceof AdminApiError
                ? error.message
                : "Could not check admin access. Please retry."}
            </span>
          </div>
          <div className="page-actions">
            {code === "mfa_required" && (
              <button
                type="button"
                className="studio-button"
                onClick={() =>
                  void loginWithRedirect(adminLoginOptions(location.pathname))
                }
              >
                Sign in again with MFA
              </button>
            )}
            {code === "account_not_provisioned" && (
              <Link className="studio-button" to="/account">
                Open your account page
              </Link>
            )}
            {code === undefined && (
              <button
                type="button"
                className="studio-button-secondary"
                onClick={() => {
                  setState({ phase: "loading" });
                  setAttempt((n) => n + 1);
                }}
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const inboxCount =
    summary.status === "ready" ? (summary.data.openInquiries ?? 0) : 0;
  const { me } = state.value;
  return (
    <AdminContext.Provider value={context!}>
      <div className="studio-page ops-page admin-shell">
        <div className="studio-container admin-layout">
          <aside className="admin-side">
            <nav className="admin-nav" aria-label="Admin">
              {nav.map((g) => (
                <div key={g.group} className="admin-nav-group">
                  <p className="admin-nav-heading" id={`nav-${g.group}`}>
                    {g.group}
                  </p>
                  <ul aria-labelledby={`nav-${g.group}`}>
                    {g.items.map((item) => (
                      <li key={item.to}>
                        <NavLink to={item.to} end className="admin-nav-link">
                          {item.label}
                          {item.to === "/admin/inbox" && inboxCount > 0 && (
                            <span className="admin-badge admin-mono">
                              {inboxCount}
                              <span className="sr-only"> open</span>
                            </span>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            <div className="admin-side-meta">
              <button
                type="button"
                className="admin-palette-trigger"
                onClick={() => setPaletteOpen(true)}
              >
                <Search size={16} aria-hidden="true" />
                <span>Jump to…</span>
                <kbd className="admin-mono">Ctrl K</kbd>
              </button>
              <span className="admin-role">
                Signed in as {me.role}
                {me.role === "editor" && me.canPublish ? " (can publish)" : ""}
              </span>
            </div>
          </aside>
          <main className="admin-main">
            <Outlet />
          </main>
        </div>
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          items={paletteItems}
        />
      </div>
    </AdminContext.Provider>
  );
}
