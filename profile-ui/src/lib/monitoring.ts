import { onCLS, onINP, onLCP } from "web-vitals";

type EventName =
  "web_vital" | "ui_error" | "contact_success" | "contact_failure";
// Only categories/numbers: never messages, emails, tokens, or URLs.
export function reportEvent(
  event: EventName,
  metric?: { name: string; value: number },
) {
  // No backend sink: events are only logged in development.
  if (import.meta.env.DEV) console.debug("[monitoring]", event, metric ?? "");
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
