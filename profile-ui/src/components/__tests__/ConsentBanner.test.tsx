import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ConsentBanner from "../ConsentBanner";
import {
  __resetAnalyticsForTests,
  initAnalytics,
  openConsent,
} from "@/lib/analytics";

const ui = () => (
  <MemoryRouter>
    <ConsentBanner />
  </MemoryRouter>
);

beforeEach(() => {
  __resetAnalyticsForTests();
  window.dataLayer = undefined;
  localStorage.clear();
});
afterEach(() => vi.unstubAllEnvs());

describe("ConsentBanner", () => {
  it("renders nothing without a measurement id", () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "");
    render(ui());
    expect(screen.queryByText("Accept analytics")).toBeNull();
  });

  it("shows, persists a decline, and hides; can reopen", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
    initAnalytics();
    render(ui());
    expect(
      screen.getByRole("link", { name: /privacy policy/i }),
    ).toHaveAttribute("href", "/privacy");
    expect(screen.getByText("Accept analytics")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Decline"));
    expect(localStorage.getItem("consent.analytics")).toBe("denied");
    expect(screen.queryByText("Decline")).toBeNull();
    act(() => openConsent());
    expect(screen.getByText("Decline")).toBeInTheDocument();
  });

  it("stays hidden when a choice is stored", () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
    localStorage.setItem("consent.analytics", "granted");
    render(ui());
    expect(screen.queryByText("Accept analytics")).toBeNull();
  });
});
