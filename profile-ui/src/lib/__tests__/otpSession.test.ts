import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clear, getToken, setToken } from "../otpSession";

describe("otpSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns null when nothing is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("round-trips a token through sessionStorage", () => {
    setToken("tok", 1800);
    expect(getToken()).toBe("tok");
    expect(sessionStorage.getItem("resume.otp")).toContain("tok");
  });

  it("expires 5 seconds early", () => {
    setToken("tok", 100);
    vi.advanceTimersByTime(94_000);
    expect(getToken()).toBe("tok");
    vi.advanceTimersByTime(2_000);
    expect(getToken()).toBeNull();
  });

  it("clear removes the token everywhere", () => {
    setToken("tok", 1800);
    clear();
    expect(getToken()).toBeNull();
    expect(sessionStorage.getItem("resume.otp")).toBeNull();
  });

  it("ignores corrupt stored values", () => {
    sessionStorage.setItem("resume.otp", "{nope");
    expect(getToken()).toBeNull();
    sessionStorage.setItem(
      "resume.otp",
      JSON.stringify({ token: 5, exp: "x" }),
    );
    expect(getToken()).toBeNull();
  });

  it("falls back to memory when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    setToken("mem", 1800);
    expect(getToken()).toBe("mem");
    clear();
    expect(getToken()).toBeNull();
  });

  it("never logs the token", () => {
    const spies = (["log", "warn", "error", "info", "debug"] as const).map(
      (m) => vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    setToken("secret-token", 1800);
    getToken();
    clear();
    spies.forEach((s) => expect(s).not.toHaveBeenCalled());
  });
});
