import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/auth/auth";
import { adminFetch, AdminApiError } from "@/api/adminApi";
import { adminLoginOptions } from "./adminLogin";
import "@/styles/pages.css";
import "@/styles/admin.css";

const KEY = "admin.invite";

/** Moves a `#token=` fragment into session storage; false when it is malformed. */
export function stashInviteToken(hash: string): boolean {
  const m = /^#token=([A-Za-z0-9_-]{40,64})$/.exec(hash);
  if (!m) return false;
  try {
    sessionStorage.setItem(KEY, m[1]);
  } catch {
    return false;
  }
  return true;
}

/** Reads and clears the stashed token so it can be used at most once. */
export function takeInviteToken(): string | null {
  try {
    const t = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return t;
  } catch {
    return null;
  }
}

type View =
  | { phase: "working" }
  | { phase: "done" }
  | { phase: "missing" }
  | { phase: "error"; message: string };

export default function InviteAcceptPage() {
  const {
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    getAccessTokenSilently,
  } = useAuth();
  const [view, setView] = useState<View>({ phase: "working" });
  const stripped = useRef(false);
  const started = useRef(false);

  // The token travels in the URL fragment; move it out of the address bar immediately.
  useEffect(() => {
    if (stripped.current) return;
    stripped.current = true;
    if (window.location.hash) {
      stashInviteToken(window.location.hash);
      window.history.replaceState(null, "", "/admin/invite");
    }
  }, []);

  useEffect(() => {
    if (isLoading || started.current) return;
    started.current = true;
    if (!isAuthenticated) {
      void loginWithRedirect(adminLoginOptions("/admin/invite"));
      return;
    }
    const token = takeInviteToken();
    if (!token) {
      setView({ phase: "missing" });
      return;
    }
    (async () => {
      try {
        const jwt = await getAccessTokenSilently();
        await adminFetch(jwt, "/invites/accept", {
          method: "POST",
          body: { token },
        });
        setView({ phase: "done" });
      } catch (error) {
        setView({
          phase: "error",
          message:
            error instanceof AdminApiError
              ? error.message
              : "Could not accept the invite. Please retry from the link.",
        });
      }
    })();
  }, [isLoading, isAuthenticated, loginWithRedirect, getAccessTokenSilently]);

  return (
    <div className="studio-page ops-page admin-shell">
      <Helmet>
        <title>Accept invite</title>
        <meta name="referrer" content="no-referrer" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="studio-container admin-section admin-narrow">
        <header className="admin-head">
          <h1 className="admin-title">Accept invite</h1>
        </header>
        {view.phase === "working" && (
          <p role="status" className="ops-loading">
            <Loader2 className="ops-spinner" size={18} aria-hidden="true" />
            Checking your invite…
          </p>
        )}
        {view.phase === "done" && (
          <div className="admin-block">
            <p role="status" className="page-notice page-notice--success">
              <CheckCircle2 size={20} aria-hidden="true" />
              <span>You&apos;re an editor. Sign-in is complete.</span>
            </p>
            <Link className="studio-button" to="/admin">
              Open the admin
            </Link>
          </div>
        )}
        {view.phase === "missing" && (
          <p role="alert" className="page-notice page-notice--warning">
            <AlertCircle size={20} aria-hidden="true" />
            <span>
              No invite found in this session. Open the invite link again.
            </span>
          </p>
        )}
        {view.phase === "error" && (
          <p role="alert" className="page-notice page-notice--error">
            <AlertCircle size={20} aria-hidden="true" />
            <span>{view.message}</span>
          </p>
        )}
      </div>
    </div>
  );
}
