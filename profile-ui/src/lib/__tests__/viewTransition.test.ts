import { describe, it, expect, vi, afterEach } from "vitest";
import {
  notifyRouteCommitted,
  runRouteTransition,
  supportsRouteTransition,
} from "../viewTransition";

type Doc = { startViewTransition?: unknown };
const doc = document as unknown as Doc;
const mockMotion = (reduce: boolean) =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (q: string) =>
      ({
        matches: reduce && q.includes("reduce"),
        media: q,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  );

afterEach(() => {
  delete doc.startViewTransition;
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("data-route-transition");
});

describe("runRouteTransition", () => {
  it("runs update immediately when unsupported", () => {
    mockMotion(false);
    const update = vi.fn();
    expect(supportsRouteTransition()).toBe(false);
    runRouteTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("runs update immediately under reduced motion", () => {
    mockMotion(true);
    const svt = vi.fn();
    doc.startViewTransition = svt;
    const update = vi.fn();
    runRouteTransition(update);
    expect(svt).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("wraps update in a view transition, flags root, skips prior", async () => {
    mockMotion(false);
    const skips: Array<ReturnType<typeof vi.fn>> = [];
    let resolveFinished: () => void = () => {};
    doc.startViewTransition = vi.fn((cb: () => Promise<void>) => {
      void cb();
      const skip = vi.fn();
      skips.push(skip);
      return {
        skipTransition: skip,
        finished: new Promise<void>((r) => {
          resolveFinished = r;
        }),
      };
    });
    const update = vi.fn();
    runRouteTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.hasAttribute("data-route-transition")).toBe(
      true,
    );
    runRouteTransition(update);
    expect(skips[0]).toHaveBeenCalledTimes(1);
    resolveFinished();
    await Promise.resolve();
    await Promise.resolve();
    expect(update).toHaveBeenCalledTimes(2);
  });
});

describe("snapshot timing", () => {
  it("callback promise resolves only after route commit", async () => {
    mockMotion(false);
    let cbPromise: Promise<void> | undefined;
    doc.startViewTransition = vi.fn((cb: () => Promise<void>) => {
      cbPromise = cb();
      return { skipTransition() {}, finished: new Promise(() => {}) };
    });
    runRouteTransition(() => {});
    let resolved = false;
    void cbPromise!.then(() => (resolved = true));
    await Promise.resolve();
    expect(resolved).toBe(false);
    notifyRouteCommitted();
    await cbPromise;
    expect(resolved).toBe(true);
  });

  it("falls back to a timeout so the transition never hangs", async () => {
    vi.useFakeTimers();
    mockMotion(false);
    let cbPromise: Promise<void> | undefined;
    doc.startViewTransition = vi.fn((cb: () => Promise<void>) => {
      cbPromise = cb();
      return { skipTransition() {}, finished: new Promise(() => {}) };
    });
    runRouteTransition(() => {});
    await vi.advanceTimersByTimeAsync(301);
    await expect(cbPromise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
