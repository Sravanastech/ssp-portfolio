import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { z } from "@/lib/zod";
import { AlertCircle, Info, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/auth/auth";
import { adminRequest } from "@/api/accountApi";

const SIZE = 25;
const pageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      firstVerifiedAt: z.string(),
      lastVerifiedAt: z.string(),
      verifyCount: z.number(),
    }),
  ),
  page: z.number(),
  size: z.number(),
  total: z.number(),
});
type Page = z.infer<typeof pageSchema>;
type Visitor = Page["items"][number];

const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

export default function VisitorsPanel({
  enabled = true,
}: {
  enabled?: boolean;
}) {
  const { getAccessTokenSilently } = useAuth();
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<Visitor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(
    async (index: number) => {
      setLoading(true);
      setError("");
      try {
        const token = await getAccessTokenSilently();
        const raw = await adminRequest<unknown>(
          token,
          `/resume-visitors?page=${index}&size=${SIZE}`,
        );
        setData(pageSchema.parse(raw));
      } catch (cause) {
        setError(
          cause instanceof Error && /permission/i.test(cause.message)
            ? "Only the site owner can view this list."
            : "Could not load visitors. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [getAccessTokenSilently],
  );

  useEffect(() => {
    if (enabled) void load(page);
  }, [enabled, load, page]);

  const remove = async () => {
    if (!target || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const token = await getAccessTokenSilently();
      await adminRequest(token, `/resume-visitors/${target.id}`, "DELETE");
      setTarget(null);
      setNotice("Visitor removed.");
      const lastOnPage = data?.items.length === 1 && page > 0;
      if (lastOnPage) setPage(page - 1);
      else await load(page);
    } catch {
      setDeleteError("Could not delete this visitor. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (!enabled) return null;
  const pages = data ? Math.max(1, Math.ceil(data.total / SIZE)) : 1;

  return (
    <section
      className="page-panel visitors-panel"
      aria-labelledby="visitors-title"
    >
      <h2 id="visitors-title" className="panel-title">
        Resume visitors
      </h2>
      <p className="page-small">
        Emails verified to view the resume. Deleting a row erases it for good.
      </p>

      {notice && (
        <p role="status" className="page-notice">
          <Info size={20} aria-hidden="true" />
          <span>{notice}</span>
        </p>
      )}
      {loading && (
        <p role="status" className="ops-loading">
          <Loader2 className="ops-spinner" size={18} aria-hidden="true" />
          Loading visitors…
        </p>
      )}
      {error && (
        <div role="alert" className="page-notice page-notice--error">
          <AlertCircle size={20} aria-hidden="true" />
          <span>{error}</span>
          <button
            type="button"
            className="studio-button-secondary studio-button--sm"
            onClick={() => void load(page)}
          >
            Try again
          </button>
        </div>
      )}

      {data && !error && data.items.length === 0 && !loading && (
        <p className="ops-empty">No verified visitors yet.</p>
      )}
      {data && !error && data.items.length > 0 && (
        <div
          className="ops-table-wrap"
          role="region"
          aria-label="Visitors table, scrollable"
          tabIndex={0}
        >
          <table className="ops-table">
            <caption className="sr-only">Verified resume visitors</caption>
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">First viewed</th>
                <th scope="col">Last viewed</th>
                <th scope="col">Views</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((v) => (
                <tr key={v.id}>
                  <th scope="row" className="ops-table-email">
                    {v.email}
                  </th>
                  <td>{when(v.firstVerifiedAt)}</td>
                  <td>{when(v.lastVerifiedAt)}</td>
                  <td className="ops-num">{v.verifyCount}</td>
                  <td>
                    <button
                      type="button"
                      className="studio-button-secondary studio-button--sm"
                      aria-label={`Delete ${v.email}`}
                      onClick={() => {
                        setDeleteError("");
                        setTarget(v);
                      }}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > SIZE && (
        <nav className="ops-pager" aria-label="Visitors pages">
          <button
            type="button"
            className="studio-button-secondary studio-button--sm"
            disabled={loading || page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous page
          </button>
          <span className="page-small ops-num">
            Page {page + 1} of {pages}
          </span>
          <button
            type="button"
            className="studio-button-secondary studio-button--sm"
            disabled={loading || page + 1 >= pages}
            onClick={() => setPage(page + 1)}
          >
            Next page
          </button>
        </nav>
      )}

      <Dialog.Root
        open={target !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setTarget(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="ops-dialog-overlay" />
          <Dialog.Content
            role="alertdialog"
            className="ops-dialog"
            aria-describedby="visitor-delete-desc"
          >
            <Dialog.Title className="panel-title">
              Delete this visitor?
            </Dialog.Title>
            <Dialog.Description id="visitor-delete-desc" className="page-copy">
              {target?.email} will be removed from the visitor list. This cannot
              be undone.
            </Dialog.Description>
            {deleteError && (
              <p role="alert" className="field-error">
                {deleteError}
              </p>
            )}
            <div className="page-actions">
              <button
                type="button"
                className="studio-button studio-button--danger"
                disabled={deleting}
                onClick={() => void remove()}
              >
                {deleting ? "Deleting…" : "Delete visitor"}
              </button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="studio-button-secondary"
                  disabled={deleting}
                >
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
