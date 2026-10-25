/**
 * Google Analytics 4 with Consent Mode v2.
 * Fully inert unless VITE_GA_MEASUREMENT_ID is set (dev, tests, prerender).
 * Never pass PII (names, emails, user ids, form values) to any function here.
 */
type GtagArgs = unknown[];
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
  }
}

export type ConsentChoice = "granted" | "denied";
const CONSENT_KEY = "consent.analytics";

// EEA member states + Iceland, Liechtenstein, Norway, UK, Switzerland.
const CONSENT_REGIONS = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "GB",
  "CH",
];

const SKIPPED_PATHS = new Set(["/auth-callback"]);

function getMeasurementId(): string | undefined {
  const id = (
    import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
  )?.trim();
  return id && /^G-[A-Z0-9]+$/i.test(id) ? id : undefined;
}
export const isAnalyticsEnabled = () => getMeasurementId() !== undefined;

let initialized = false;
let lastPageKey = "";
let reopened = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function readStoredConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function gtag(...args: GtagArgs) {
  void args;
  window.dataLayer = window.dataLayer || [];
  // gtag.js only processes the real `arguments` object, not an array.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

function loadScript(id: string) {
  const inject = () => {
    if (document.querySelector("script[data-ga]")) return;
    const s = document.createElement("script");
    s.async = true;
    s.dataset.ga = "1";
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
  };
  const idle = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void;
    }
  ).requestIdleCallback;
  const start = () =>
    idle ? idle(inject, { timeout: 4000 }) : setTimeout(inject, 1500);
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}

export function initAnalytics(): boolean {
  const id = getMeasurementId();
  if (!id || typeof window === "undefined") return false;
  if (initialized) return true;
  initialized = true;
  window.gtag = gtag;
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
    wait_for_update: 500,
  });
  gtag("consent", "default", {
    analytics_storage: "denied",
    region: CONSENT_REGIONS,
    wait_for_update: 500,
  });
  const stored = readStoredConsent();
  if (stored) gtag("consent", "update", { analytics_storage: stored });
  gtag("js", new Date());
  gtag("config", id, {
    send_page_view: false,
    cookie_flags: "SameSite=Lax;Secure",
  });
  loadScript(id);
  return true;
}

export function setConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    /* Choice applies for this page view only. */
  }
  if (initialized) gtag("consent", "update", { analytics_storage: choice });
  reopened = false;
  notify();
}

export function openConsent() {
  reopened = true;
  notify();
}

export function subscribeConsent(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
/** Banner shows when analytics is configured and no choice stored (or reopened). */
export function shouldShowConsent(): boolean {
  return isAnalyticsEnabled() && (reopened || readStoredConsent() === null);
}

/** Drop the query string (except utm_*) and the hash. */
export function sanitizeLocation(href: string): { url: string; path: string } {
  const u = new URL(href, window.location.origin);
  const keep = new URLSearchParams();
  u.searchParams.forEach((v, k) => {
    if (k.toLowerCase().startsWith("utm_")) keep.append(k, v);
  });
  const qs = keep.toString();
  return {
    url: `${u.origin}${u.pathname}${qs ? `?${qs}` : ""}`,
    path: u.pathname,
  };
}

export function trackPageView() {
  if (!initialized) return;
  const { url, path } = sanitizeLocation(window.location.href);
  if (SKIPPED_PATHS.has(path)) return;
  requestAnimationFrame(() =>
    setTimeout(() => {
      const key = url;
      if (key === lastPageKey) return;
      lastPageKey = key;
      gtag("event", "page_view", {
        page_location: url,
        page_path: path,
        page_title: document.title,
      });
    }, 0),
  );
}

export type AnalyticsEvent =
  "resume_sign_in_click" | "resume_view" | "contact_submit";

export function trackEvent(
  name: AnalyticsEvent,
  params: Record<string, string | number | boolean> = {},
) {
  if (!initialized) return;
  gtag("event", name, params);
}

/** Test helper. */
export function __resetAnalyticsForTests() {
  initialized = false;
  lastPageKey = "";
  reopened = false;
  listeners.clear();
}
