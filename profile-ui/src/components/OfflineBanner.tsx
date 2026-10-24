import { useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cv, tint } from "@/theme/cssVars";
import { WifiOff, X } from "lucide-react";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  const [dismissed, setDismissed] = useState(false);

  if (isOnline || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium shadow-lg transition-transform"
      style={{
        backgroundColor: tint("warning", 9),
        borderTop: `1px solid ${tint("warning", 25)}`,
        color: cv.text,
      }}
    >
      <WifiOff className="w-4 h-4 shrink-0" style={{ color: cv.warning }} />
      <span>
        You're offline. Public pages are available, but sign-in, contact
        delivery, and resume access require a connection.
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss offline notice"
        className="p-1 rounded-md hover:opacity-70 shrink-0"
        style={{ color: cv.textSecondary }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
