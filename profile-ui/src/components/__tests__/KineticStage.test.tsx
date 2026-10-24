import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ParadigmProvider } from "@/theme/ParadigmContext";
import KineticStage from "../KineticStage";

function mockMedia(matching: string[]) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matching.includes(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function renderKinetic() {
  localStorage.setItem("portfolio-paradigm", "kinetic");
  return render(
    <ParadigmProvider>
      <KineticStage />
    </ParadigmProvider>,
  );
}

describe("KineticStage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockMedia([]);
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders nothing in studio", () => {
    const { container } = render(
      <ParadigmProvider>
        <KineticStage />
      </ParadigmProvider>,
    );
    expect(container.querySelector(".kinetic-stage")).toBeNull();
  });

  it("renders ticker twice (second copy aria-hidden) with pause toggle", () => {
    const { container } = renderKinetic();
    expect(
      screen.getByRole("region", { name: /kinetic telemetry ticker/i }),
    ).toBeInTheDocument();
    const copies = container.querySelectorAll(
      ".kinetic-ticker-track > [data-copy]",
    );
    expect(copies).toHaveLength(2);
    expect(copies[1]).toHaveAttribute("aria-hidden", "true");
    expect(copies[0]).not.toHaveAttribute("aria-hidden");
    expect(copies[0].textContent).toBe(copies[1].textContent);

    const ticker = container.querySelector(".kinetic-ticker")!;
    fireEvent.click(
      screen.getByRole("button", { name: /pause kinetic ticker/i }),
    );
    const play = screen.getByRole("button", { name: /play kinetic ticker/i });
    expect(play).toHaveAttribute("aria-pressed", "true");
    expect(ticker).toHaveAttribute("data-paused", "true");
  });

  it("defaults to paused under prefers-reduced-motion", () => {
    mockMedia(["(prefers-reduced-motion: reduce)"]);
    renderKinetic();
    expect(
      screen.getByRole("button", { name: /play kinetic ticker/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("Return to Studio switches paradigm back", () => {
    const { container } = renderKinetic();
    fireEvent.click(screen.getByRole("button", { name: /return to studio/i }));
    expect(container.querySelector(".kinetic-stage")).toBeNull();
    expect(localStorage.getItem("portfolio-paradigm")).toBe("studio");
  });

  it("does not mount reticle or listen for pointermove on coarse pointers", () => {
    const add = vi.spyOn(window, "addEventListener");
    const { container } = renderKinetic();
    expect(container.querySelector(".kinetic-reticle")).toBeNull();
    expect(add.mock.calls.some(([t]) => t === "pointermove")).toBe(false);
  });

  it("fine pointer: rAF-throttled translate, cleanup on unmount", () => {
    mockMedia(["(pointer: fine)"]);
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const remove = vi.spyOn(window, "removeEventListener");
    const { container, unmount } = renderKinetic();
    const reticle = container.querySelector<HTMLElement>(".kinetic-reticle")!;
    expect(reticle).toBeInTheDocument();
    expect(reticle).toHaveAttribute("aria-hidden", "true");

    act(() => {
      window.dispatchEvent(
        new MouseEvent("pointermove", { clientX: 10, clientY: 20 }),
      );
      window.dispatchEvent(
        new MouseEvent("pointermove", { clientX: 30, clientY: 40 }),
      );
    });
    expect(frames).toHaveLength(1); // throttled
    act(() => frames[0](0));
    expect(reticle.style.translate).toBe("30px 40px");

    act(() => {
      window.dispatchEvent(
        new MouseEvent("pointermove", { clientX: 1, clientY: 2 }),
      );
    });
    unmount();
    expect(cancel).toHaveBeenCalled();
    expect(remove.mock.calls.some(([t]) => t === "pointermove")).toBe(true);
  });
});
