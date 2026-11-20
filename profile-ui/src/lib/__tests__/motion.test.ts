import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { decipherHeadingElement, useRouteHeadingDecipher } from "../motion";

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? matches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("heading decipher timing (120ms delay, 900ms duration)", () => {
  let frames: FrameRequestCallback[];
  let now: number;

  beforeEach(() => {
    frames = [];
    now = 1000;
    mockReducedMotion(false);
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  const expectDefaultTiming = (heading: HTMLElement) => {
    // Start = 1000 + 120 delay; finish = start + 900 = 2020.
    now = 2000;
    frames[frames.length - 1](now);
    expect(heading.textContent).not.toBe("Hello");
    now = 2030;
    frames[frames.length - 1](now);
    expect(heading.textContent).toBe("Hello");
  };

  it("decipherHeadingElement defaults to 120ms delay and 900ms duration", () => {
    const heading = document.createElement("h1");
    heading.textContent = "Hello";
    decipherHeadingElement(heading);
    expectDefaultTiming(heading);
  });

  it("useRouteHeadingDecipher applies 120/900 to the interior route heading", () => {
    document.body.innerHTML =
      '<main id="main-content"><h1 class="studio-page-heading">Hello</h1></main>';
    const heading = document.querySelector("h1") as HTMLElement;
    renderHook(() => useRouteHeadingDecipher(true, "/work"));
    expect(frames.length).toBeGreaterThan(0);
    expectDefaultTiming(heading);
  });

  it("useRouteHeadingDecipher skips reduced motion and data-no-decipher headings", () => {
    document.body.innerHTML =
      '<main id="main-content"><h1 class="studio-page-heading" data-no-decipher>Hello</h1></main>';
    renderHook(() => useRouteHeadingDecipher(true, "/work"));
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();

    document.body.innerHTML =
      '<main id="main-content"><h1 class="studio-page-heading">Hello</h1></main>';
    mockReducedMotion(true);
    renderHook(() => useRouteHeadingDecipher(true, "/about"));
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});
