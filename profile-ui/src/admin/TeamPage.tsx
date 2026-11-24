import { useCallback, useEffect, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, Copy, Info, Loader2, Trash2 } from "lucide-react";
import { adminFetch, AdminApiError } from "@/api/adminApi";
import { useAdmin } from "./AdminContext";
import Forbidden from "./Forbidden";
import { formatWhen } from "./format";
import "@/styles/pages.css";
import "@/styles/admin.css";

type Member = {
  accountId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: "owner" | "editor";
  canPublish: boolean;
  since: string;
};
type OpenInvite = {
  id: string;
  email: string;
  canPublish: boolean;
  createdAt: string;
  expiresAt: string;
};
type Team = { members: Member[]; invites: OpenInvite[] };
type Created = { id: string; token: string; expiresAt: string };

const messageOf = (error: unknown, fallback: string) =>
  error instanceof AdminApiError ? error.message : fallback;

function TeamPageBody({ token }: { token: string }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [email, setEmail] = useState("");
  const [canPublish, setCanPublish] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setTeam(await adminFetch<Team>(token, "/team"));
    } catch (error) {
      setLoadError(messageOf(error, "Could not load the team. Please retry."));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(
    run: () => Promise<unknown>,
    done: string,
    failed: string,
  ) {
    setActionError("");
    setNotice("");
    try {
      await run();
      setNotice(done);
      await load();
    } catch (error) {
      setActionError(messageOf(error, failed));
    }
  }

  async function sendInvite(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setFormError("");
    try {
      const result = await adminFetch<Created>(token, "/team/invites", {
        method: "POST",
        body: { email: email.trim(), canPublish },
      });
      setCreated(result);
      setCopied(false);
      setEmail("");
      setCanPublish(false);
    } catch (error) {
      setFormError(messageOf(error, "Could not create the invite."));
    } finally {
      setSending(false);
    }
  }

  function closeLink() {
    setCreated(null);
    void load();
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const link = created
    ? `${window.location.origin}/admin/invite#token=${created.token}`
    : "";

  return (
    <div className="studio-container admin-section">
      <header className="admin-head">
        <h1 className="admin-title">Team</h1>
        <p className="page-small">
          Owners can do everything. Editors work on content; “Can publish” lets
          an editor publish it.
        </p>
      </header>

      {notice && (
        <p role="status" className="page-notice">
          <Info size={20} aria-hidden="true" />
          <span>{notice}</span>
        </p>
      )}
      {actionError && (
        <p role="alert" className="page-notice page-notice--error">
          <AlertCircle size={20} aria-hidden="true" />
          <span>{actionError}</span>
        </p>
      )}
      {loading && !team && (
        <p role="status" className="ops-loading">
          <Loader2 className="ops-spinner" size={18} aria-hidden="true" />
          Loading team…
        </p>
      )}
      {loadError && (
        <div role="alert" className="page-notice page-notice--error">
          <AlertCircle size={20} aria-hidden="true" />
          <span>{loadError}</span>
          <button
            type="button"
            className="studio-button-secondary studio-button--sm"
            onClick={() => void load()}
          >
            Try again
          </button>
        </div>
      )}

      {team && (
        <>
          <section className="admin-block" aria-labelledby="members-title">
            <h2 id="members-title" className="admin-subtitle">
              Members
            </h2>
            <div
              className="ops-table-wrap"
              role="region"
              aria-label="Members table, scrollable"
              tabIndex={0}
            >
              <table className="ops-table admin-table">
                <caption className="sr-only">Team members</caption>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Since</th>
                    <th scope="col">Can publish</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {team.members.map((m) => {
                    const name =
                      `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "—";
                    const who = m.email ?? name;
                    return (
                      <tr key={m.accountId}>
                        <th scope="row">{name}</th>
                        <td className="admin-mono admin-wrap">
                          {m.email ?? "—"}
                        </td>
                        <td>
                          <span className="ops-badge ops-badge--role">
                            {m.role === "owner" ? "Owner" : "Editor"}
                          </span>
                        </td>
                        <td>
                          <time className="admin-mono" dateTime={m.since}>
                            {formatWhen(m.since)}
                          </time>
                        </td>
                        <td>
                          {m.role === "owner" ? (
                            <span className="page-small">Always</span>
                          ) : (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={m.canPublish}
                              aria-label={`Can publish: ${who}`}
                              className="admin-switch"
                              onClick={() =>
                                void act(
                                  () =>
                                    adminFetch(token, `/team/${m.accountId}`, {
                                      method: "PATCH",
                                      body: { canPublish: !m.canPublish },
                                    }),
                                  "Publish permission updated.",
                                  "Could not update the permission.",
                                )
                              }
                            >
                              <span
                                className="admin-switch-track"
                                aria-hidden="true"
                              />
                              {m.canPublish ? "On" : "Off"}
                            </button>
                          )}
                        </td>
                        <td>
                          {m.role === "editor" && (
                            <button
                              type="button"
                              className="studio-button-secondary studio-button--sm"
                              aria-label={`Remove ${who}`}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `Remove ${who} from the team? They lose admin access immediately.`,
                                  )
                                )
                                  return;
                                void act(
                                  () =>
                                    adminFetch(token, `/team/${m.accountId}`, {
                                      method: "DELETE",
                                    }),
                                  "Editor removed.",
                                  "Could not remove this editor.",
                                );
                              }}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-block" aria-labelledby="invites-title">
            <h2 id="invites-title" className="admin-subtitle">
              Open invites
            </h2>
            {team.invites.length === 0 ? (
              <p className="ops-empty">No open invites.</p>
            ) : (
              <div
                className="ops-table-wrap"
                role="region"
                aria-label="Open invites table, scrollable"
                tabIndex={0}
              >
                <table className="ops-table admin-table">
                  <caption className="sr-only">Open invites</caption>
                  <thead>
                    <tr>
                      <th scope="col">Email</th>
                      <th scope="col">Can publish</th>
                      <th scope="col">Expires</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.invites.map((i) => (
                      <tr key={i.id}>
                        <th scope="row" className="admin-mono admin-wrap">
                          {i.email}
                        </th>
                        <td>{i.canPublish ? "Yes" : "No"}</td>
                        <td>
                          <time className="admin-mono" dateTime={i.expiresAt}>
                            {formatWhen(i.expiresAt)}
                          </time>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="studio-button-secondary studio-button--sm"
                            aria-label={`Revoke invite for ${i.email}`}
                            onClick={() =>
                              void act(
                                () =>
                                  adminFetch(token, `/team/invites/${i.id}`, {
                                    method: "DELETE",
                                  }),
                                "Invite revoked.",
                                "Could not revoke this invite.",
                              )
                            }
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <section className="admin-block" aria-labelledby="invite-title">
        <h2 id="invite-title" className="admin-subtitle">
          Invite editor
        </h2>
        <form className="admin-form" onSubmit={(e) => void sendInvite(e)}>
          <div className="field">
            <label className="field-label" htmlFor="invite-email">
              Email
            </label>
            <input
              id="invite-email"
              className="field-input"
              type="email"
              autoComplete="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={formError ? true : undefined}
              aria-describedby={formError ? "invite-error" : "invite-hint"}
            />
            {formError ? (
              <p id="invite-error" role="alert" className="field-error">
                {formError}
              </p>
            ) : (
              <p id="invite-hint" className="field-hint">
                They must sign in with this verified email to accept.
              </p>
            )}
          </div>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={canPublish}
              onChange={(e) => setCanPublish(e.target.checked)}
            />
            <span>Can publish</span>
          </label>
          <button type="submit" className="studio-button" disabled={sending}>
            {sending ? "Sending…" : "Send invite"}
          </button>
        </form>
      </section>

      <Dialog.Root
        open={created !== null}
        onOpenChange={(open) => {
          if (!open) closeLink();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="ops-dialog-overlay" />
          <Dialog.Content
            className="ops-dialog admin-dialog"
            aria-describedby="invite-link-desc"
          >
            <Dialog.Title className="panel-title">Invite link</Dialog.Title>
            <Dialog.Description id="invite-link-desc" className="page-small">
              Send this link to the invitee. Shown once. Expires{" "}
              {created ? formatWhen(created.expiresAt) : ""}.
            </Dialog.Description>
            <div className="field">
              <label className="field-label" htmlFor="invite-link">
                Invite link
              </label>
              <input
                id="invite-link"
                className="field-input admin-mono"
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
            <p role="status" className="page-small">
              {copied ? "Link copied to clipboard." : ""}
            </p>
            <div className="page-actions">
              <button
                type="button"
                className="studio-button"
                onClick={() => void copyLink(link)}
              >
                <Copy size={16} aria-hidden="true" />
                Copy link
              </button>
              <Dialog.Close asChild>
                <button type="button" className="studio-button-secondary">
                  Done
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export default function TeamPage() {
  const { me, token } = useAdmin();
  if (!me.permissions.includes("team.manage")) return <Forbidden />;
  return <TeamPageBody token={token} />;
}
