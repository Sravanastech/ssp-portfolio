import { AlertCircle } from "lucide-react";

/** Shown when the signed-in role lacks the permission a sub-page needs. */
export default function Forbidden() {
  return (
    <div className="studio-container admin-section">
      <p role="alert" className="page-notice page-notice--error">
        <AlertCircle size={20} aria-hidden="true" />
        <span>Your role does not include this area.</span>
      </p>
    </div>
  );
}
