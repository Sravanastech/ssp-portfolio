import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ParadigmProvider, useParadigm } from "../ParadigmContext";
import { prefetchAetherStyles } from "../paradigmStyles";

function Harness() {
  const {
    paradigm,
    isKinetic,
    isAether,
    setParadigm,
    toggleParadigm,
    prefetchAether,
  } = useParadigm();
  return (
    <div>
      <button
        type="button"
        onClick={() => toggleParadigm({ x: 120, y: 40 })}
        data-testid="paradigm-btn"
      >
        {paradigm}:{String(isKinetic)}:{String(isAether)}
      </button>
      <button
        type="button"
        onClick={() => setParadigm("studio", { x: 40, y: 20 })}
        data-testid="set-studio"
      >
        Studio
      </button>
      <button
        type="button"
        onClick={() => setParadigm("kinetic", { x: 80, y: 30 })}
        data-testid="set-kinetic"
      >
        Kinetic
      </button>
      <button
        type="button"
        onClick={() => setParadigm("aether", { x: 200, y: 60 })}
        data-testid="set-aether"
      >
        Aether
      </button>
      <button
        type="button"
        onClick={prefetchAether}
        data-testid="prefetch-aether"
      >
        Prefetch Aether
      </button>
    </div>
  );
}

const originalMatchMedia = window.matchMedia;

function fakeTransition(
  overrides: Partial<{ ready: Promise<void>; finished: Promise<void> }> = {},
) {
  return {
    ready: Promise.resolve(),
    finished: Promise.resolve(),
    skipTransition: vi.fn(),
    ...overrides,
  };
}

describe("ParadigmContext", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.paradigm;
    delete document.documentElement.dataset.paradigmTransition;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (document as Partial<Document> & { startViewTransition?: unknown })
      .startViewTransition;
    delete (
      document.documentElement as Partial<HTMLElement> & { animate?: unknown }
    ).animate;
    window.matchMedia = originalMatchMedia;
  });

  it("defaults to aether and sets data-paradigm on documentElement", () => {
    render(
      <ParadigmProvider>
        <Harness />
      </ParadigmProvider>,
    );
    expect(screen.getByTestId("paradigm-btn")).toHaveTextContent(
      "aether:false:true",
    );
    expect(document.documentElement.dataset.paradigm).toBe("aether");
  });

  it.each(["", "Studio", "bogus", "null"])(
    "falls back to aether for an invalid stored value (%j)",
    (value) => {
      localStorage.setItem("portfolio-paradigm", value);
      render(
        <ParadigmProvider>
          <Harness />
        </ParadigmProvider>,
      );
      expect(screen.getByTestId("paradigm-btn")).toHaveTextContent(
        "aether:false:true",
      );
      expect(document.documentElement.dataset.paradigm).toBe("aether");
    },
  );

  it("falls back to aether when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(
      <ParadigmProvider>
        <Harness />
      </ParadigmProvider>,
    );
    expect(document.documentElement.dataset.paradigm).toBe("aether");
  });

  it("respects a stored studio choice", () => {
    localStorage.setItem("portfolio-paradigm", "studio");
    render(
      <ParadigmProvider>
        <Harness />
      </ParadigmProvider>,
    );
    expect(screen.getByTestId("paradigm-btn")).toHaveTextContent(
      "studio:false:false",
    );
    expect(document.documentElement.dataset.paradigm).toBe("studio");
  });

  it("respects a stored kinetic choice", () => {
    localStorage.setItem("portfolio-paradigm", "kinetic");
    render(
      <ParadigmProvider>
        <Harness />
      </ParadigmProvider>,
    );
    expect(screen.getByTestId("paradigm-btn")).toHaveTextContent(
      "kinetic:true:false",
    );
    expect(document.documentElement.dataset.paradigm).toBe("kinetic");
  });

  it("toggles between studio and kinetic, persisting to localStorage", () => {
    localStorage.setItem("portfolio-paradigm", "studio");
    render(
      <ParadigmProvider>
        <Harness />
      </ParadigmProvider>,
    );
    fireEvent.click(screen.getByTestId("paradigm-btn"));
    expect(screen.getByTestId("paradigm-btn")).toHaveTextContent(
      "kinetic:true:false",
    );
    expect(document.documentElement.dataset.paradigm).toBe("kinetic");
    expect(localStorage.getItem("portfolio-paradigm")).toBe("kinetic");

    fireEvent.click(screen.getByTestId("paradigm-btn"));
    expect(screen.getByTestId("paradigm-btn")).toHaveTextContent(
      "studio:false:false",
    );
    expect(document.documentElement.dataset.paradigm).toBe("studio");
  });

  it("supports aether selection, persistence, restoration, and 3-way transitions", () => {
    render(
      <ParadigmProvider>
        <Harness />
      </ParadigmProvider>,
    );

    fireEvent.click(screen.getByTestId("set-aether"));
    expect(screen.getByTestId("paradigm-btn")).toHaveTextContent(
      "aether:false:true",
    );
    expect(document.documentElement.dataset.paradigm).toBe("aether");
    expect(localStorage.getItem("portfolio-paradigm")).toBe("aether");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Switched to Aether cinematic design",
    );

    fireEvent.click(screen.getByTestId("set-kinetic"));
    expect(screen.getByTestId("paradigm-btn")).toHaveTextContent(
      "kinetic:true:false",
    );
    expect(document.documentElement.dataset.paradigm).toBe("kinetic");
    expect(localStorage.getItem("portfolio-paradigm")).toBe("kinetic");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Switched to Kinetic maximalist design",
    );

    fireEvent.click(screen.getByTestId("set-aether"));
    expect(screen.getByTestId("paradigm-btn")).toHaveTextContent(
      "aether:false:true",
    );
    expect(document.documentElement.dataset.paradigm).toBe("aether");

    fireEvent.click(screen.getByTestId("set-studio"));
    expect(screen.getByTestId("paradigm-btn")).toHaveTextContent(
      "studio:false:false",
    );
    expect(document.documentElement.dataset.paradigm).toBe("studio");
    expect(localStorage.getItem("portfolio-paradigm")).toBe("studio");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Switched to Studio minimalist design",
    );
  });

  it("restores aether from localStorage on mount", () => {
    localStorage.setItem("portfolio-paradigm", "aether");
    render(
      <ParadigmProvider>
        <Harness />
      </ParadigmProvider>,
    );
    expect(screen.getByTestId("paradigm-btn")).toHaveTextContent(
      "aether:false:true",
    );
    expect(document.documentElement.dataset.paradigm).toBe("aether");
  });

  it("provides safe defaults outside ParadigmProvider and prefetches aether without throwing", async () => {
    render(<Harness />);
    expect(screen.getByTestId("paradigm-btn")).toHaveTextContent(
      "aether:false:true",
    );
    expect(() =>
      fireEvent.click(screen.getByTestId("prefetch-aether")),
    ).not.toThrow();
    await expect(prefetchAetherStyles()).resolves.toBeUndefined();
  });

  it("uses document.startViewTransition when available and motion is allowed", async () => {
    const animateMock = vi.fn();
    document.documentElement.animate =
      animateMock as unknown as typeof document.documentElement.animate;
    const ready = Promise.resolve();
    const startVT = vi.fn((cb: () => void) => {
      cb();
      return {
        ready,
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition: vi.fn(),
      };
    });
    Object.defineProperty(document, "startViewTransition", {
      value: startVT,
      configurable: true,
      writable: true,
    });

    render(
      <ParadigmProvider>
        <Harness />
      </ParadigmProvider>,
    );
    fireEvent.click(screen.getByTestId("paradigm-btn"));
    expect(startVT).toHaveBeenCalledTimes(1);
    await ready;
    expect(animateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clipPath: expect.arrayContaining([
          expect.stringContaining("circle(0px at 120px 40px)"),
        ]),
      }),
      expect.objectContaining({
        pseudoElement: "::view-transition-new(root)",
      }),
    );
  });

  it("defers the view-transition snapshot until the Kinetic CSS has loaded", async () => {
    document.documentElement.animate =
      vi.fn() as unknown as typeof document.documentElement.animate;
    let snapshot: (() => Promise<void> | void) | undefined;
    const startVT = vi.fn((cb: () => Promise<void> | void) => {
      snapshot = cb;
      return fakeTransition();
    });
    Object.defineProperty(document, "startViewTransition", {
      value: startVT,
      configurable: true,
      writable: true,
    });

    localStorage.setItem("portfolio-paradigm", "studio");
    render(
      <ParadigmProvider>
        <Harness />
      </ParadigmProvider>,
    );
    fireEvent.click(screen.getByTestId("paradigm-btn"));
    expect(startVT).toHaveBeenCalledTimes(1);
    // Snapshot callback has not run yet, so Studio DOM is still in place.
    expect(document.documentElement.dataset.paradigm).toBe("studio");

    const done = snapshot!();
    expect(done).toBeInstanceOf(Promise);
    await done;
    expect(document.documentElement.dataset.paradigm).toBe("kinetic");
  });

  it("defers the view-transition snapshot until the Aether CSS has loaded", async () => {
    document.documentElement.animate =
      vi.fn() as unknown as typeof document.documentElement.animate;
    let snapshot: (() => Promise<void> | void) | undefined;
    const startVT = vi.fn((cb: () => Promise<void> | void) => {
      snapshot = cb;
      return fakeTransition();
    });
    Object.defineProperty(document, "startViewTransition", {
      value: startVT,
      configurable: true,
      writable: true,
    });

    localStorage.setItem("portfolio-paradigm", "studio");
    render(
      <ParadigmProvider>
        <Harness />
      </ParadigmProvider>,
    );
    fireEvent.click(screen.getByTestId("set-aether"));
    expect(startVT).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.paradigm).toBe("studio");

    const done = snapshot!();
    expect(done).toBeInstanceOf(Promise);
    await done;
    expect(document.documentElement.dataset.paradigm).toBe("aether");
  });

  it("removes the paradigm-transition marker when a later toggle skips the portal", () => {
    document.documentElement.animate =
      vi.fn() as unknown as typeof document.documentElement.animate;
    const first = fakeTransition({ finished: new Promise<void>(() => {}) });
    Object.defineProperty(document, "startViewTransition", {
      value: vi.fn(() => first),
      configurable: true,
      writable: true,
    });

    localStorage.setItem("portfolio-paradigm", "studio");
    render(
      <ParadigmProvider>
        <Harness />
      </ParadigmProvider>,
    );
    fireEvent.click(screen.getByTestId("paradigm-btn"));
    expect(document.documentElement.dataset.paradigmTransition).toBe("portal");

    // Reduced motion kicks in mid-transition: the next toggle takes the no-animation path.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    fireEvent.click(screen.getByTestId("paradigm-btn"));

    expect(first.skipTransition).toHaveBeenCalled();
    expect(
      document.documentElement.hasAttribute("data-paradigm-transition"),
    ).toBe(false);
    expect(document.documentElement.dataset.paradigm).toBe("studio");
    expect(localStorage.getItem("portfolio-paradigm")).toBe("studio");
  });
});
