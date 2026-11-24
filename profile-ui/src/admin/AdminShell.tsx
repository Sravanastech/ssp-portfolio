import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/auth/auth";
import { adminFetch, AdminApiError, type AdminMe } from "@/api/adminApi";
import { AdminContext, type AdminContextValue } from "./AdminContext";
import { adminLoginOptions } from "./adminLogin";
import { visibleNav } from "./permissions";
import "@/styles/pages.css";
import "@/styles/admin.css";

type State =
  | { phase: "loading" }
  | { phase: "ready"; value: AdminContextValue }
  | { phase: "error"; error: AdminApiError | Error };

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

  const nav = useMemo(
    () =>
      state.phase === "ready" ? visibleNav(state.value.me.permissions) : [],
    [state],
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

  return (
    <AdminContext.Provider value={state.value}>
      <div className="studio-page ops-page admin-shell">
        <div className="studio-container">
          <nav className="admin-nav" aria-label="Admin">
            <ul>
              {nav.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end className="admin-nav-link">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <span className="admin-role">
              Signed in as {state.value.me.role}
              {state.value.me.role === "editor" && state.value.me.canPublish
                ? " (can publish)"
                : ""}
            </span>
          </nav>
        </div>
        <Outlet />
      </div>
    </AdminContext.Provider>
  );
}
