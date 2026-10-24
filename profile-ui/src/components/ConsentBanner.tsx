import { useEffect, useRef, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import {
  setConsent,
  shouldShowConsent,
  subscribeConsent,
} from "@/lib/analytics";
import { SiteText } from "@/content/SiteContent";
import "@/styles/consent.css";

export default function ConsentBanner() {
  const visible = useSyncExternalStore(
    subscribeConsent,
    shouldShowConsent,
    () => false,
  );
  const ref = useRef<HTMLElement>(null);
  const wasHidden = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!visible || !el) return;
    const root = document.documentElement;
    const sync = () => {
      root.style.setProperty("--consent-height", `${el.offsetHeight + 16}px`);
    };
    sync();
    root.classList.add("has-consent");
    const ro =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    ro?.observe(el);
    // Move focus only when the visitor reopened the banner on purpose.
    if (wasHidden.current && document.readyState === "complete") {
      const opener = document.activeElement;
      if (opener && opener !== document.body) el.focus();
    }
    wasHidden.current = false;
    return () => {
      ro?.disconnect();
      root.classList.remove("has-consent");
      root.style.removeProperty("--consent-height");
      wasHidden.current = true;
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <section
      ref={ref}
      tabIndex={-1}
      className="consent-banner"
      aria-labelledby="consent-title"
    >
      <div className="consent-copy">
        <h2 id="consent-title" className="consent-title">
          <SiteText id="components.ConsentBanner.text.1" />
        </h2>
        <p>
          <SiteText id="components.ConsentBanner.text.2" />{" "}
          <Link to="/privacy">
            <SiteText id="components.ConsentBanner.text.3" />
          </Link>
        </p>
      </div>
      <div className="consent-actions">
        <button
          type="button"
          className="consent-button"
          onClick={() => setConsent("granted")}
        >
          <SiteText id="components.ConsentBanner.text.4" />
        </button>
        <button
          type="button"
          className="consent-button"
          onClick={() => setConsent("denied")}
        >
          <SiteText id="components.ConsentBanner.text.5" />
        </button>
      </div>
    </section>
  );
}
