import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetAnalyticsForTests,
  initAnalytics,
  sanitizeLocation,
  setConsent,
  shouldShowConsent,
  trackEvent,
  trackPageView,
} from "./analytics";

const calls = () =>
  (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));

beforeEach(() => {
  vi.unstubAllEnvs();
  __resetAnalyticsForTests();
  window.dataLayer = undefined;
  window.gtag = undefined;
  document.head.querySelectorAll("script[data-ga]").forEach((s) => s.remove());
  localStorage.clear();
});

describe("analytics without measurement id", () => {
  it("is a full no-op", () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "");
    expect(initAnalytics()).toBe(false);
    trackEvent("resume_view");
    trackPageView();
    expect(window.dataLayer).toBeUndefined();
    expect(shouldShowConsent()).toBe(false);
    expect(document.querySelector("script[data-ga]")).toBeNull();
  });
});

describe("analytics with measurement id", () => {
  beforeEach(() => vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123"));

  it("declares consent defaults before config", () => {
    initAnalytics();
    const c = calls();
    expect(c[0]).toEqual([
      "consent",
      "default",
      expect.objectContaining({
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "granted",
        wait_for_update: 500,
      }),
    ]);
    const regional = c[1][2] as { region: string[]; analytics_storage: string };
    expect(regional.analytics_storage).toBe("denied");
    expect(regional.region).toEqual(expect.arrayContaining(["DE", "GB", "CH"]));
    const cfg = c.find((x) => x[0] === "config");
    expect(cfg?.[2]).toMatchObject({
      send_page_view: false,
      cookie_flags: "SameSite=Lax;Secure",
    });
    expect(c.indexOf(cfg!)).toBeGreaterThan(1);
  });

  it("applies stored choice via consent update before config", () => {
    localStorage.setItem("consent.analytics", "denied");
    initAnalytics();
    const c = calls();
    const update = c.findIndex((x) => x[0] === "consent" && x[1] === "update");
    expect(c[update][2]).toEqual({ analytics_storage: "denied" });
    expect(update).toBeLessThan(c.findIndex((x) => x[0] === "config"));
  });

  it("setConsent persists and sends update", () => {
    initAnalytics();
    expect(shouldShowConsent()).toBe(true);
    setConsent("granted");
    expect(localStorage.getItem("consent.analytics")).toBe("granted");
    expect(calls().slice(-1)[0]).toEqual([
      "consent",
      "update",
      { analytics_storage: "granted" },
    ]);
    expect(shouldShowConsent()).toBe(false);
  });

  it("sanitizes URLs: drops query and hash except utm_*", () => {
    expect(
      sanitizeLocation("https://x.com/a?code=1&state=2&utm_source=li#h"),
    ).toEqual({ url: "https://x.com/a?utm_source=li", path: "/a" });
    expect(sanitizeLocation("https://x.com/b?email=a@b.c").url).toBe(
      "https://x.com/b",
    );
  });

  it("sends sanitized page_view and skips /auth-callback", async () => {
    initAnalytics();
    window.history.pushState({}, "", "/work?token=secret&utm_medium=cv#x");
    trackPageView();
    await vi.waitFor(() =>
      expect(calls().some((x) => x[1] === "page_view")).toBe(true),
    );
    const pv = calls().find((x) => x[1] === "page_view")![2] as Record<
      string,
      string
    >;
    expect(pv.page_location).toBe(`${location.origin}/work?utm_medium=cv`);
    expect(pv.page_path).toBe("/work");
    window.history.pushState({}, "", "/auth-callback?code=a&state=b");
    trackPageView();
    await new Promise((r) => setTimeout(r, 50));
    expect(calls().filter((x) => x[1] === "page_view")).toHaveLength(1);
  });

  it("trackEvent pushes named events", () => {
    initAnalytics();
    trackEvent("contact_submit", { method: "web3forms" });
    expect(calls().slice(-1)[0]).toEqual([
      "event",
      "contact_submit",
      { method: "web3forms" },
    ]);
  });
});
