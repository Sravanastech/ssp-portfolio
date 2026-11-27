import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { adminFetch, type InquiryRow } from "@/api/adminApi";
import { useAdmin } from "./AdminContext";
import Forbidden from "./Forbidden";
import InquiryDetail from "./InquiryDetail";
import { formatWhen } from "./format";
import "@/styles/pages.css";
import "@/styles/admin.css";

const PAGE_SIZE = 25;
type Tab = "open" | "replied" | "archived";
const TABS: { id: Tab; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "replied", label: "Replied" },
  { id: "archived", label: "Archived" },
];

function inTab(row: InquiryRow, tab: Tab): boolean {
  if (tab === "archived") return row.archived;
  if (row.archived) return false;
  return tab === "replied" ? row.replied_at !== null : row.replied_at === null;
}

function InboxBody() {
  const { me, getToken, refreshSummary } = useAdmin();
  const canReply = me.permissions.includes("inquiries.reply");
  const [items, setItems] = useState<InquiryRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(
    async (next: number) => {
      setLoading(true);
      setError(false);
      try {
        const token = await getToken();
        const rows = await adminFetch<InquiryRow[]>(
          token,
          `/inquiries?page=${next}`,
        );
        setItems((prev) => (next === 0 ? rows : [...prev, ...rows]));
        setPage(next);
        setHasMore(rows.length >= PAGE_SIZE);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [getToken],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  const visible = items.filter((i) => inTab(i, tab));
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const count = (t: Tab) => items.filter((i) => inTab(i, t)).length;

  function markReplied(id: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              replied_at: new Date().toISOString(),
              reply_count: i.reply_count + 1,
            }
          : i,
      ),
    );
    refreshSummary?.();
  }

  function markArchived(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, archived: true } : i)),
    );
    setSelectedId(null);
    refreshSummary?.();
  }

  return (
    <div className="studio-container admin-section">
      <header className="admin-head">
        <h1 className="admin-title">Inbox</h1>
        <p className="page-small">
          Private contact inquiries and notification delivery status.
        </p>
      </header>

      <div className={`admin-inbox${selected ? " admin-inbox--detail" : ""}`}>
        <section className="admin-inbox-list" aria-label="Messages">
          <div role="group" aria-label="Message status" className="admin-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tab === t.id}
                className="admin-tab"
                onClick={() => {
                  setTab(t.id);
                  setSelectedId(null);
                }}
              >
                {t.label} <span className="admin-mono">{count(t.id)}</span>
              </button>
            ))}
          </div>
          <div>
            {loading && items.length === 0 && (
              <p role="status" className="ops-loading">
                <Loader2 className="ops-spinner" size={18} aria-hidden="true" />
                Loading messages…
              </p>
            )}
            {error && (
              <div role="alert" className="page-notice page-notice--error">
                <AlertCircle size={20} aria-hidden="true" />
                <span>Could not load messages.</span>
                <button
                  type="button"
                  className="studio-button-secondary studio-button--sm"
                  onClick={() => void load(page)}
                >
                  Try again
                </button>
              </div>
            )}
            {!loading && !error && visible.length === 0 && (
              <p className="ops-empty">
                {tab === "open"
                  ? "No open messages."
                  : tab === "replied"
                    ? "No replied messages yet."
                    : "No archived messages."}
              </p>
            )}
            {visible.length > 0 && (
              <ul className="admin-rows">
                {visible.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="admin-row"
                      aria-current={row.id === selectedId ? "true" : undefined}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <span className="admin-row-top">
                        <strong>{row.name}</strong>
                        <time className="admin-mono" dateTime={row.created_at}>
                          {formatWhen(row.created_at)}
                        </time>
                      </span>
                      <span className="admin-row-snippet">{row.message}</span>
                      {row.reply_count > 0 && (
                        <span className="admin-mono admin-row-meta">
                          {row.reply_count} repl
                          {row.reply_count === 1 ? "y" : "ies"}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {hasMore && (
              <div className="ops-pager">
                <button
                  type="button"
                  className="studio-button-secondary"
                  disabled={loading}
                  onClick={() => void load(page + 1)}
                >
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="admin-inbox-detail">
          {selected ? (
            <>
              <button
                type="button"
                className="studio-link admin-back"
                onClick={() => setSelectedId(null)}
              >
                ← All messages
              </button>
              <InquiryDetail
                key={selected.id}
                inquiry={selected}
                canReply={canReply}
                onArchived={markArchived}
                onReplied={markReplied}
              />
            </>
          ) : (
            <p className="ops-empty admin-detail-empty">
              Select a message to read it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { me } = useAdmin();
  if (!me.permissions.includes("inquiries.manage")) return <Forbidden />;
  return <InboxBody />;
}
