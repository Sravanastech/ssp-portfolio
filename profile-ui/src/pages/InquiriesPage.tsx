import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/auth";
import { AlertCircle } from "lucide-react";
import { adminRequest } from "@/api/accountApi";
import "@/styles/pages.css";
type Inquiry = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  archived: boolean;
  created_at: string;
  delivery: string;
};
export default function InquiriesPage() {
  const { getAccessTokenSilently } = useAuth();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    async (next: number) => {
      setBusy(true);
      try {
        const token = await getAccessTokenSilently();
        const rows = await adminRequest<Inquiry[]>(
          token,
          `/inquiries?page=${next}`,
        );
        setItems(rows);
        setPage(next);
        setNotice("");
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Could not load messages.");
      } finally {
        setBusy(false);
      }
    },
    [getAccessTokenSilently],
  );
  useEffect(() => {
    void load(0);
  }, [load]);
  async function archive(id: string) {
    setBusy(true);
    try {
      const token = await getAccessTokenSilently();
      await adminRequest<void>(token, `/inquiries/${id}/archive`, `PATCH`);
      await load(page);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not archive message.");
      setBusy(false);
    }
  }
  return (
    <div className="studio-page ops-page">
      <div className="studio-container">
        <header className="studio-page-intro">
          <Link className="studio-link ops-back" to="/admin">
            ← Site editor
          </Link>
          <h1 className="studio-page-heading">Messages</h1>
          <p className="studio-lede">
            Private contact inquiries and notification delivery status.
          </p>
        </header>
        {notice && (
          <p role="alert" className="page-notice page-notice--error">
            <AlertCircle size={20} aria-hidden="true" />
            <span>{notice}</span>
          </p>
        )}
        {items.length === 0 && !busy ? (
          <p className="ops-empty">No messages on this page.</p>
        ) : (
          <ul className="ops-list">
            {items.map((i) => (
              <li key={i.id}>
                <div className="ops-row-head">
                  <h2>{i.name}</h2>
                  <time dateTime={i.created_at}>
                    {new Date(i.created_at).toLocaleString()}
                  </time>
                </div>
                <p className="page-small">
                  {i.email || i.phone || "No reply address"} · notification{" "}
                  {i.delivery}
                </p>
                <p className="ops-message">{i.message}</p>
                {!i.archived && (
                  <div className="ops-row-actions">
                    <button
                      className="studio-button-secondary studio-button--sm"
                      disabled={busy}
                      onClick={() => void archive(i.id)}
                    >
                      Archive message
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="ops-pager">
          <button
            className="studio-button-secondary studio-button--sm"
            disabled={busy || page === 0}
            onClick={() => void load(page - 1)}
          >
            Previous
          </button>
          <button
            className="studio-button-secondary studio-button--sm"
            disabled={busy || items.length < 25}
            onClick={() => void load(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
