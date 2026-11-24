import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import type { Account } from "@/api/accountApi";

interface AccountSecurityPanelProps {
  account: Account | null;
  userEmail?: string;
}

export function AccountSecurityPanel({
  account,
  userEmail,
}: AccountSecurityPanelProps) {
  const displayName = account
    ? `${account.firstName} ${account.lastName}`.trim() || "Your Account"
    : "Your Account";

  return (
    <header className="studio-page-intro">
      <h1 className="studio-page-heading">{displayName}</h1>
      <div className="ops-identity">
        <span className="ops-badge ops-badge--ok">
          <ShieldCheck size={14} aria-hidden="true" />
          Verified Identity
        </span>
        {account?.admin && (
          <span className="ops-badge ops-badge--role">Admin access</span>
        )}
        <span className="page-small">{userEmail}</span>
      </div>
      {account?.admin && (
        <div className="studio-actions">
          <Link to="/admin" className="studio-button studio-button--sm">
            Site Editor
          </Link>
        </div>
      )}
    </header>
  );
}
