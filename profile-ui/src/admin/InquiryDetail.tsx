import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  adminFetch,
  AdminApiError,
  type InquiryReply,
  type InquiryRow,
} from "@/api/adminApi";
import { useAdmin } from "./AdminContext";
import { formatWhen } from "./format";

const MAX_REPLY = 5000;

type Props = {
  inquiry: InquiryRow;
  canReply: boolean;
  onArchived: (id: string) => void;
  onReplied: (id: string) => void;
};

/** Detail panel for one inquiry: contact info, message, reply history and (if allowed) composer. */
export default function InquiryDetail({
  inquiry,
  canReply,
  onArchived,
  onReplied,
}: Props) {
  const { getToken } = useAdmin();
  const [replies, setReplies] = useState<InquiryReply[] | null>(null);
  const [repliesError, setRepliesError] = useState(false);
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<AdminApiError | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  const loadReplies = useCallback(async () => {
    setRepliesError(false);
    try {
      const token = await getToken();
      setReplies(
        await adminFetch<InquiryReply[]>(
          token,
          `/inquiries/${inquiry.id}/replies`,
        ),
      );
    } catch {
      setRepliesError(true);
    }
  }, [getToken, inquiry.id]);

  useEffect(() => {
    setReplies(null);
    void loadReplies();
  }, [loadReplies]);

  async function send() {
    setConfirming(false);
    setSending(true);
    setFailure(null);
    try {
      const token = await getToken();
      await adminFetch(token, `/inquiries/${inquiry.id}/replies`, {
        method: "POST",
        body: { body: body.trim() },
      });
      setBody("");
      onReplied(inquiry.id);
    } catch (error) {
      setFailure(
        error instanceof AdminApiError
          ? error
          : new AdminApiError("Request failed. Please retry.", 0),
      );
    } finally {
      setSending(false);
      void loadReplies();
    }
  }

  async function archive() {
    setArchiving(true);
    setArchiveError("");
    try {
      const token = await getToken();
      await adminFetch(token, `/inquiries/${inquiry.id}/archive`, {
        method: "PATCH",
      });
      onArchived(inquiry.id);
    } catch {
      setArchiveError("Could not archive this message.");
      setArchiving(false);
    }
  }

  const trimmed = body.trim();
  const tooLong = body.length > MAX_REPLY;
  const hasEmail = Boolean(inquiry.email && inquiry.email.trim());

  return (
    <article
      className="admin-detail"
      aria-label={`Message from ${inquiry.name}`}
    >
      <header className="admin-detail-head">
        <h2 className="admin-subtitle">{inquiry.name}</h2>
        <dl className="admin-facts">
          <div>
            <dt>Email</dt>
            <dd>
              {inquiry.email ? (
                <a className="studio-link" href={`mailto:${inquiry.email}`}>
                  {inquiry.email}
                </a>
              ) : (
                "None"
              )}
            </dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>
              {inquiry.phone ? (
                <a className="studio-link" href={`tel:${inquiry.phone}`}>
                  {inquiry.phone}
                </a>
              ) : (
                "None"
              )}
            </dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd className="admin-mono">{formatWhen(inquiry.created_at)}</dd>
          </div>
          <div>
            <dt>Owner notification</dt>
            <dd className="admin-mono">{inquiry.delivery}</dd>
          </div>
        </dl>
      </header>
      <p className="ops-message">{inquiry.message}</p>

      <section aria-labelledby="reply-history" className="admin-block">
        <h3 id="reply-history" className="admin-minor">
          Replies
        </h3>
        {replies === null && !repliesError && (
          <p role="status" className="ops-loading">
            <Loader2 className="ops-spinner" size={18} aria-hidden="true" />
            Loading replies…
          </p>
        )}
        {repliesError && (
          <div role="alert" className="page-notice page-notice--error">
            <AlertCircle size={20} aria-hidden="true" />
            <span>Could not load replies.</span>
            <button
              type="button"
              className="studio-button-secondary studio-button--sm"
              onClick={() => void loadReplies()}
            >
              Try again
            </button>
          </div>
        )}
        {replies?.length === 0 && <p className="ops-empty">No replies yet.</p>}
        {replies && replies.length > 0 && (
          <ul className="admin-replies">
            {replies.map((r) => (
              <li key={r.id}>
                <p className="admin-reply-meta admin-mono">
                  {r.authorName} · {formatWhen(r.createdAt)} ·{" "}
                  <span>{r.status}</span>
                </p>
                <p className="ops-message">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canReply && (
        <section aria-labelledby="reply-composer" className="admin-block">
          <h3 id="reply-composer" className="admin-minor">
            Reply by email
          </h3>
          {!hasEmail ? (
            <p className="page-notice">
              {inquiry.phone
                ? `No email — call or text ${inquiry.phone}`
                : "No email or phone on this message."}
            </p>
          ) : (
            <form
              className="admin-form admin-compose"
              onSubmit={(e) => {
                e.preventDefault();
                if (trimmed && !tooLong) setConfirming(true);
              }}
            >
              <div className="field">
                <label className="field-label" htmlFor="reply-body">
                  Your reply
                </label>
                <textarea
                  id="reply-body"
                  className="field-input admin-reply-input"
                  rows={6}
                  value={body}
                  disabled={sending}
                  aria-describedby="reply-note reply-count"
                  onChange={(e) => setBody(e.target.value)}
                />
                <p id="reply-count" className="admin-mono admin-count">
                  <span aria-live="polite">
                    {body.length}/{MAX_REPLY}
                  </span>
                </p>
                <p id="reply-note" className="field-hint">
                  Sent from mail.sravanasparimi.com. Their reply goes to your
                  inbox.
                </p>
              </div>
              {failure && (
                <div role="alert" className="page-notice page-notice--error">
                  <AlertCircle size={20} aria-hidden="true" />
                  <span>{failure.message}</span>
                  {failure.code === "email_failed" && (
                    <button
                      type="button"
                      className="studio-button-secondary studio-button--sm"
                      disabled={sending}
                      onClick={() => void send()}
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
              <button
                type="submit"
                className="studio-button"
                disabled={sending || !trimmed || tooLong}
              >
                {sending ? "Sending…" : "Send reply"}
              </button>
            </form>
          )}
        </section>
      )}

      {!inquiry.archived && (
        <div className="admin-block">
          {archiveError && (
            <p role="alert" className="page-notice page-notice--error">
              <AlertCircle size={20} aria-hidden="true" />
              <span>{archiveError}</span>
            </p>
          )}
          <div>
            <button
              type="button"
              className="studio-button-secondary"
              disabled={archiving}
              onClick={() => void archive()}
            >
              {archiving ? "Archiving…" : "Archive message"}
            </button>
          </div>
        </div>
      )}

      <Dialog.Root open={confirming} onOpenChange={setConfirming}>
        <Dialog.Portal>
          <Dialog.Overlay className="ops-dialog-overlay" />
          <Dialog.Content
            className="ops-dialog admin-dialog"
            aria-describedby="reply-confirm-desc"
          >
            <Dialog.Title className="panel-title">
              Send this reply?
            </Dialog.Title>
            <Dialog.Description id="reply-confirm-desc" className="page-small">
              This emails {inquiry.name} at {inquiry.email}. It cannot be
              unsent.
            </Dialog.Description>
            <div className="page-actions">
              <button
                type="button"
                className="studio-button"
                onClick={() => void send()}
              >
                Send email
              </button>
              <Dialog.Close asChild>
                <button type="button" className="studio-button-secondary">
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </article>
  );
}
