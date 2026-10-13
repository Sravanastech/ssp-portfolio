import { useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useTheme } from "@/theme/ThemeContext";
import { WifiOff, X } from "lucide-react";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (isOnline || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium shadow-lg transition-transform"
      style={{
        backgroundColor: colors.warning + "18",
        borderTop: `1px solid ${colors.warning}40`,
        color: colors.text,
      }}
    >
      <WifiOff className="w-4 h-4 shrink-0" style={{ color: colors.warning }} />
      <span>
        You're offline. Public pages are available, but sign-in, contact
        delivery, and resume access require a connection.
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss offline notice"
        className="p-1 rounded-md hover:opacity-70 shrink-0"
        style={{ color: colors.textSecondary }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
