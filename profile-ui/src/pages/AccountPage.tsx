import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/auth";
import {
  accountRequest,
  type Account,
  type AccountProfileUpdate,
} from "@/api/accountApi";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { AccountSecurityPanel } from "@/components/account/AccountSecurityPanel";
import { AccountProfileForm } from "@/components/account/AccountProfileForm";
import { AccountDangerZone } from "@/components/account/AccountDangerZone";
import "@/styles/pages.css";

export default function AccountPage() {
  const { getAccessTokenSilently, user, logout } = useAuth();

  const [account, setAccount] = useState<Account | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadProfile = useCallback(async () => {
    setInitialLoading(true);
    setStatusMessage(null);
    try {
      const token = await getAccessTokenSilently();
      const provisioned = await accountRequest<Account>(token, "POST", {
        firstName: user?.given_name ?? "",
        lastName: user?.family_name ?? "",
      });
      const current = await accountRequest<Account>(token);
      const active = current ?? provisioned;
      setAccount(active);
    } catch (error) {
      setStatusMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Your account profile could not be loaded.",
      });
    } finally {
      setInitialLoading(false);
    }
  }, [getAccessTokenSilently, user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onSave = async (payload: AccountProfileUpdate) => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const token = await getAccessTokenSilently();
      const updated = await accountRequest<Account>(token, "PUT", payload);
      setAccount(updated);
      setStatusMessage({
        type: "success",
        text: "Your account profile has been saved successfully.",
      });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not save profile changes. Please retry.",
      });
    } finally {
      setSaving(false);
    }
  };

  const onDeleteProfile = async () => {
    setDeleting(true);
    try {
      const token = await getAccessTokenSilently();
      await accountRequest(token, "DELETE");
      await logout({ logoutParams: { returnTo: window.location.origin } });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Could not delete profile.",
      });
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="studio-page ops-page">
      <div className="studio-container">
        <div className="ops-column">
          <AccountSecurityPanel account={account} userEmail={user?.email} />

          {statusMessage && (
            <div
              role="status"
              className={`page-notice page-notice--${statusMessage.type}`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 size={20} aria-hidden="true" />
              ) : (
                <AlertCircle size={20} aria-hidden="true" />
              )}
              <div>{statusMessage.text}</div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="link-button"
              >
                Dismiss
              </button>
            </div>
          )}

          {initialLoading ? (
            <p role="status" className="ops-loading">
              <Loader2 className="ops-spinner" size={18} aria-hidden="true" />
              Loading your profile data...
            </p>
          ) : (
            <AccountProfileForm
              account={account}
              userEmail={user?.email}
              saving={saving}
              onSave={onSave}
              onDiscard={() => setStatusMessage(null)}
            />
          )}

          <AccountDangerZone
            deleting={deleting}
            confirmDelete={confirmDelete}
            onRequestDelete={() => setConfirmDelete(true)}
            onCancelDelete={() => setConfirmDelete(false)}
            onConfirmDelete={() => void onDeleteProfile()}
          />
        </div>
      </div>
    </div>
  );
}
