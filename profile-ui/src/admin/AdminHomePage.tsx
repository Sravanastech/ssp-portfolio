import { Link } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import type { AdminSummary } from "@/api/adminApi";
import { useAdmin } from "./AdminContext";
import "@/styles/pages.css";
import "@/styles/admin.css";

type Card = {
  key: string;
  label: string;
  value: string;
  to: string;
  attention: boolean;
};

function cards(summary: AdminSummary): Card[] {
  const out: Card[] = [];
  const { openInquiries, draftPending, newResumeVisitors7d, deniedEvents7d } =
    summary;
  if (openInquiries !== undefined)
    out.push({
      key: "inbox",
      label: "Open inquiries",
      value: String(openInquiries),
      to: "/admin/inbox",
      attention: openInquiries > 0,
    });
  if (draftPending !== undefined)
    out.push({
      key: "draft",
      label: "Draft waiting",
      value: draftPending ? "Yes" : "No",
      to: "/admin/content",
      attention: draftPending,
    });
  if (newResumeVisitors7d !== undefined)
    out.push({
      key: "people",
      label: "New resume visitors, 7 days",
      value: String(newResumeVisitors7d),
      to: "/admin/people",
      attention: newResumeVisitors7d > 0,
    });
  if (deniedEvents7d !== undefined)
    out.push({
      key: "audit",
      label: "Denied attempts, 7 days",
      value: String(deniedEvents7d),
      to: "/admin/settings/audit",
      attention: deniedEvents7d > 0,
    });
  return out;
}

/** Admin landing page: only the counts the role may see, each linking to where to act. */
export default function AdminHomePage() {
  const { summary, refreshSummary } = useAdmin();
  const state = summary ?? { status: "loading" as const };
  const items = state.status === "ready" ? cards(state.data) : [];
  return (
    <div className="studio-container admin-section">
      <header className="admin-head">
        <h1 className="admin-title">Home</h1>
        <p className="page-small">What needs attention right now.</p>
      </header>
      {state.status === "loading" && (
        <p role="status" className="ops-loading">
          <Loader2 className="ops-spinner" size={18} aria-hidden="true" />
          Loading summary…
        </p>
      )}
      {state.status === "error" && (
        <div role="alert" className="page-notice page-notice--error">
          <AlertCircle size={20} aria-hidden="true" />
          <span>Could not load the summary.</span>
          {refreshSummary && (
            <button
              type="button"
              className="studio-button-secondary studio-button--sm"
              onClick={refreshSummary}
            >
              Try again
            </button>
          )}
        </div>
      )}
      {state.status === "ready" && !items.some((c) => c.attention) && (
        <p className="ops-empty">All caught up. Nothing needs attention.</p>
      )}
      {items.length > 0 && (
        <ul className="admin-cards">
          {items.map((c) => (
            <li key={c.key}>
              <Link
                className={`admin-card${c.attention ? " admin-card--attention" : ""}`}
                to={c.to}
              >
                <span className="admin-card-value admin-mono">{c.value}</span>
                <span className="admin-card-label">{c.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
