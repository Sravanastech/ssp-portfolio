import { onCLS, onINP, onLCP } from "web-vitals";

type EventName =
  "web_vital" | "ui_error" | "contact_success" | "contact_failure";
// Only categories/numbers: never messages, emails, tokens, or URLs.
export function reportEvent(
  event: EventName,
  metric?: { name: string; value: number },
) {
  if (
    !import.meta.env.PROD ||
    import.meta.env.VITE_MONITORING_ENABLED !== "true"
  )
    return;
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, ...(metric ? { metric } : {}) }),
    keepalive: true,
  }).catch(() => {
    /* Monitoring must never interrupt the visitor. */
  });
}
let started = false;
export function startMonitoring() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("error", () => reportEvent("ui_error"));
  window.addEventListener("unhandledrejection", () => reportEvent("ui_error"));
  const record = ({ name, value }: { name: string; value: number }) =>
    reportEvent("web_vital", { name, value });
  onCLS(record);
  onINP(record);
  onLCP(record);
}
