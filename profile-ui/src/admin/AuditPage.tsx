import { Fragment, useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, ShieldAlert } from "lucide-react";
import { adminFetch, AdminApiError } from "@/api/adminApi";
import { useAdmin } from "./AdminContext";
import Forbidden from "./Forbidden";
import { formatWhen } from "./format";
import "@/styles/pages.css";
import "@/styles/admin.css";

const AUDIT_ACTIONS = [
  "draft.create",
  "draft.save",
  "publish.request",
  "inquiry.archive",
  "resume_visitor.list",
  "resume_visitor.delete",
  "team.invite",
  "team.invite.revoke",
  "team.accept",
  "team.publish",
  "team.remove",
  "access.denied",
] as const;

type Entry = {
  id: number;
  at: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  resource: string | null;
  outcome: string;
  details: string | null;
};
type AuditPageData = { items: Entry[]; next: number | null };

const PAGE_SIZE = 50;

function prettyDetails(raw: string | null): string {
  if (!raw) return "No details recorded.";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function AuditPageBody({ token }: { token: string }) {
  const [action, setAction] = useState("");
  const [items, setItems] = useState<Entry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(
    async (before: number | null) => {
      setLoading(true);
      setError("");
      const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (before !== null) query.set("before", String(before));
      if (action) query.set("action", action);
      try {
        const page = await adminFetch<AuditPageData>(
          token,
          `/audit?${query.toString()}`,
        );
        setItems((current) =>
          before === null ? page.items : [...current, ...page.items],
        );
        setNext(page.next);
      } catch (cause) {
        setError(
          cause instanceof AdminApiError
            ? cause.message
            : "Could not load the audit log. Please retry.",
        );
      } finally {
        setLoading(false);
      }
    },
    [token, action],
  );

  useEffect(() => {
    setOpen(null);
    void load(null);
  }, [load]);

  return (
    <div className="studio-container admin-section">
      <header className="admin-head">
        <h1 className="admin-title">Audit log</h1>
        <p className="page-small">
          Every admin action, newest first. Records hold ids only, never emails
          or tokens.
        </p>
      </header>

      <div className="admin-filters">
        <div className="field">
          <label className="field-label" htmlFor="audit-action">
            Action
          </label>
          <select
            id="audit-action"
            className="field-input"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <p role="status" className="ops-loading">
          <Loader2 className="ops-spinner" size={18} aria-hidden="true" />
          Loading audit log…
        </p>
      )}
      {error && (
        <div role="alert" className="page-notice page-notice--error">
          <AlertCircle size={20} aria-hidden="true" />
          <span>{error}</span>
          <button
            type="button"
            className="studio-button-secondary studio-button--sm"
            onClick={() => void load(null)}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="ops-empty">No matching events.</p>
      )}

      {items.length > 0 && (
        <div
          className="ops-table-wrap"
          role="region"
          aria-label="Audit log table, scrollable"
          tabIndex={0}
        >
          <table className="ops-table admin-table">
            <caption className="sr-only">Audit events, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Actor</th>
                <th scope="col">Action</th>
                <th scope="col">Resource</th>
                <th scope="col">Outcome</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const expanded = open === e.id;
                const denied = e.outcome === "denied";
                return (
                  <Fragment key={e.id}>
                    <tr>
                      <td>
                        <time className="admin-mono" dateTime={e.at}>
                          {formatWhen(e.at)}
                        </time>
                      </td>
                      <td className="admin-wrap">
                        {e.actorName || (
                          <span className="admin-mono">
                            {e.actorId ? e.actorId.slice(0, 8) : "system"}
                          </span>
                        )}
                      </td>
                      <td className="admin-mono">{e.action}</td>
                      <td className="admin-mono admin-wrap">
                        {e.resource ?? "—"}
                      </td>
                      <td>
                        <span
                          className={`admin-outcome ${
                            denied ? "admin-outcome--denied" : ""
                          }`}
                        >
                          {denied ? (
                            <ShieldAlert size={16} aria-hidden="true" />
                          ) : (
                            <Check size={16} aria-hidden="true" />
                          )}
                          {denied ? "Denied" : "OK"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="studio-button-secondary studio-button--sm"
                          aria-expanded={expanded}
                          aria-controls={`audit-details-${e.id}`}
                          aria-label={`Details for event ${e.id}`}
                          onClick={() => setOpen(expanded ? null : e.id)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={6} className="admin-details-cell">
                          <pre
                            id={`audit-details-${e.id}`}
                            className="admin-details"
                          >
                            {prettyDetails(e.details)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {next !== null && (
        <div className="ops-pager">
          <button
            type="button"
            className="studio-button-secondary"
            disabled={loading}
            onClick={() => void load(next)}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  const { me, token } = useAdmin();
  if (!me.permissions.includes("audit.read")) return <Forbidden />;
  return <AuditPageBody token={token} />;
}
