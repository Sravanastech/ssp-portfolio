import { useEffect } from "react";

/**
 * Sets html[data-app-ready] once React has mounted and handlers are live. The prerendered
 * DOM is inert before this; e2e waits on it because the deferred bundle can land after
 * the load event on slow devices.
 */
export default function AppReady() {
  useEffect(() => {
    document.documentElement.dataset.appReady = "true";
  }, []);
  return null;
}
