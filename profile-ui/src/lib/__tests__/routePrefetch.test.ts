import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  prefetchRoute,
  resolveRouteKey,
  scheduleIdlePrefetch,
  shouldSkipPrefetch,
  routeLoaders,
  __resetPrefetchForTests,
} from "../routePrefetch";

describe("resolveRouteKey", () => {
  it("maps paths, ignoring query and hash", () => {
    expect(resolveRouteKey("/work")).toBe("/work");
    expect(resolveRouteKey("/about#experience")).toBe("/about");
    expect(resolveRouteKey("/contact?x=1")).toBe("/contact");
    expect(resolveRouteKey("/work/some-project")).toBe("/work/:slug");
    expect(resolveRouteKey("/work/")).toBe("/work");
  });
  it("returns null for unknown or eager routes", () => {
    expect(resolveRouteKey("/")).toBeNull();
    expect(resolveRouteKey("/nope")).toBeNull();
    expect(resolveRouteKey("https://example.com/work")).toBeNull();
  });
});

describe("prefetchRoute", () => {
  beforeEach(() => __resetPrefetchForTests());
  it("loads a route chunk once and caches the promise", async () => {
    const loader = vi.fn(() => Promise.resolve({}));
    const spy = vi
      .spyOn(routeLoaders, "/about")
      .mockImplementation(loader as never);
    const a = prefetchRoute("/about#x");
    const b = prefetchRoute("/about");
    expect(a).toBe(b);
    await a;
    expect(loader).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
  it("resolves for unknown routes without throwing", async () => {
    await expect(prefetchRoute("/nope")).resolves.toBeUndefined();
  });
  it("allows retry after a failed load", async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("x"))
      .mockResolvedValue({});
    vi.spyOn(routeLoaders, "/contact").mockImplementation(loader as never);
    await prefetchRoute("/contact");
    await prefetchRoute("/contact");
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

describe("shouldSkipPrefetch", () => {
  const set = (c: unknown) =>
    Object.defineProperty(navigator, "connection", {
      value: c,
      configurable: true,
    });
  afterEach(() => set(undefined));
  it("skips on saveData and 2g", () => {
    set({ saveData: true });
    expect(shouldSkipPrefetch()).toBe(true);
    set({ effectiveType: "2g" });
    expect(shouldSkipPrefetch()).toBe(true);
    set({ effectiveType: "slow-2g" });
    expect(shouldSkipPrefetch()).toBe(true);
  });
  it("does not skip on 4g or unknown", () => {
    set({ effectiveType: "4g" });
    expect(shouldSkipPrefetch()).toBe(false);
    set(undefined);
    expect(shouldSkipPrefetch()).toBe(false);
  });
});

describe("scheduleIdlePrefetch", () => {
  beforeEach(() => {
    __resetPrefetchForTests();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, "connection", {
      value: undefined,
      configurable: true,
    });
  });
  it("prefetches likely routes on idle (setTimeout fallback)", async () => {
    const spies = (["/work", "/about", "/contact"] as const).map((k) =>
      vi
        .spyOn(routeLoaders, k)
        .mockImplementation((() => Promise.resolve({})) as never),
    );
    scheduleIdlePrefetch();
    expect(spies[0]).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    spies.forEach((s) => expect(s).toHaveBeenCalledTimes(1));
  });
  it("does nothing when saveData is on, and cancel works", async () => {
    const s = vi
      .spyOn(routeLoaders, "/work")
      .mockImplementation((() => Promise.resolve({})) as never);
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true },
      configurable: true,
    });
    scheduleIdlePrefetch();
    await vi.runAllTimersAsync();
    expect(s).not.toHaveBeenCalled();
    Object.defineProperty(navigator, "connection", {
      value: undefined,
      configurable: true,
    });
    const cancel = scheduleIdlePrefetch();
    cancel();
    await vi.runAllTimersAsync();
    expect(s).not.toHaveBeenCalled();
  });
});
