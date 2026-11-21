import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import HudFrame from "../HudFrame";
import {
  FUI_DURATIONS,
  FUI_EASE,
  decipherHeadingElement,
  prefersReducedMotion,
  useAsciiScramble,
} from "@/lib/motion";

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

function ScrambleProbe({
  target,
  active = true,
}: {
  target: string;
  active?: boolean;
}) {
  const value = useAsciiScramble(target, active);
  return <span data-testid="scramble-output">{value}</span>;
}

describe("HudFrame", () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders the perimeter frame with all 4 corner brackets, crosshairs, status, and scroll telemetry", () => {
    const { container } = render(
      <HudFrame
        fuiTheme="void"
        onOpenAppearance={vi.fn()}
        onOpenCommand={vi.fn()}
        locationLabel="SAN FRANCISCO // 37.7749N"
      />,
    );

    const frame = container.querySelector(".fui-hud-frame");
    expect(frame).toBeInTheDocument();
    expect(frame).toHaveStyle({ pointerEvents: "none" });
    expect(frame).toHaveAttribute("data-fui-theme", "void");

    const brackets = container.querySelectorAll(".fui-corner-bracket");
    expect(brackets).toHaveLength(4);
    const positions = Array.from(brackets).map((el) =>
      el.getAttribute("data-position"),
    );
    expect(positions).toEqual(["tl", "tr", "bl", "br"]);
    for (const bracket of brackets) {
      expect(bracket).toHaveAttribute("width", "12");
      expect(bracket).toHaveAttribute("height", "12");
      expect(bracket).toHaveAttribute("aria-hidden", "true");
    }

    const crosshairs = container.querySelectorAll(".fui-crosshair");
    expect(crosshairs).toHaveLength(2);
    for (const crosshair of crosshairs) {
      expect(crosshair).toHaveAttribute("width", "14");
      expect(crosshair).toHaveAttribute("height", "14");
      expect(crosshair).toHaveAttribute("aria-hidden", "true");
    }

    expect(screen.getByText("SAN FRANCISCO // 37.7749N")).toBeInTheDocument();
    expect(screen.getByText("SYS.NOMINAL // 60FPS")).toBeInTheDocument();
    expect(screen.getByText("SCROLL // 000%")).toBeInTheDocument();
  });

  it("shows the VOID / CLEANROOM state and opens the appearance panel on click", () => {
    const onOpenAppearance = vi.fn();
    render(
      <HudFrame
        fuiTheme="void"
        onOpenAppearance={onOpenAppearance}
        onOpenCommand={vi.fn()}
        locationLabel="NYC"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Open appearance settings",
    });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("data-state", "void");
    expect(trigger).toHaveTextContent("VOID");
    expect(trigger).toHaveTextContent("CLEANROOM");

    fireEvent.click(trigger);
    expect(onOpenAppearance).toHaveBeenCalledTimes(1);
  });

  it("fires onOpenCommand when the ⌘K button is clicked inside the interactive dock", () => {
    const onOpenCommand = vi.fn();
    const { container } = render(
      <HudFrame
        fuiTheme="void"
        onOpenAppearance={vi.fn()}
        onOpenCommand={onOpenCommand}
        locationLabel="NYC"
      />,
    );

    const dock = container.querySelector(".fui-hud-dock");
    expect(dock).toHaveStyle({ pointerEvents: "auto" });

    const cmdBtn = screen.getByRole("button", {
      name: "Open system command palette",
    });
    expect(cmdBtn).toHaveTextContent("⌘K");

    fireEvent.click(cmdBtn);
    expect(onOpenCommand).toHaveBeenCalledTimes(1);
  });

  it("updates live UTC clock every 1s via ref and scroll telemetry via passive RAF", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:34:56.000Z"));

    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });

    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
    });

    render(
      <HudFrame
        fuiTheme="void"
        onOpenAppearance={vi.fn()}
        onOpenCommand={vi.fn()}
        locationLabel="NYC"
      />,
    );

    expect(screen.getByLabelText("Live UTC clock")).toHaveTextContent(
      "12:34:56 UTC",
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByLabelText("Live UTC clock")).toHaveTextContent(
      "12:34:57 UTC",
    );

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 500,
    });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
    });
    expect(frames).toHaveLength(1);
    act(() => frames[0](0));
    expect(screen.getByText("SCROLL // 050%")).toBeInTheDocument();
  });
});

describe("motion helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports FUI motion constants and reduced-motion helper", () => {
    expect(FUI_EASE).toBe("cubic-bezier(0.16, 1, 0.3, 1)");
    expect(FUI_DURATIONS).toEqual({ grid: 900, reveal: 750, modal: 320 });

    mockReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);

    mockReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("returns target immediately when reduced motion is enabled and cleans up RAF otherwise", () => {
    mockReducedMotion(true);
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");
    const { unmount } = render(<ScrambleProbe target="NOMINAL" />);
    expect(screen.getByTestId("scramble-output")).toHaveTextContent("NOMINAL");
    expect(rafSpy).not.toHaveBeenCalled();
    unmount();

    mockReducedMotion(false);
    const frames: FrameRequestCallback[] = [];
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");

    const activeRender = render(<ScrambleProbe target="NOMINAL" />);
    expect(frames).toHaveLength(1);

    now = 1150;
    act(() => frames[0](now));
    expect(screen.getByTestId("scramble-output").textContent?.length).toBe(
      "NOMINAL".length,
    );

    now = 2700;
    act(() => frames[1](now));
    expect(screen.getByTestId("scramble-output")).toHaveTextContent("NOMINAL");

    activeRender.rerender(<ScrambleProbe target="UPDATED" />);
    activeRender.unmount();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it("deciphers heading text nodes across <br /> boundaries and restores exact text on finish or cancel", () => {
    mockReducedMotion(false);
    const frames: FrameRequestCallback[] = [];
    let now = 500;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });

    const heading = document.createElement("h1");
    heading.className = "studio-page-heading";
    heading.innerHTML = "<span>Selected</span><br /><span>Work</span>";

    const cancel = decipherHeadingElement(heading, {
      delayMs: 100,
      durationMs: 1000,
    });
    expect(heading.getAttribute("aria-label")).toBe("Selected Work");
    expect(frames).toHaveLength(1);

    now = 800;
    frames[0](now);
    expect(heading.querySelector("br")).not.toBeNull();

    now = 1700;
    frames[1](now);
    expect(heading.textContent).toBe("SelectedWork");
    expect(heading.hasAttribute("aria-label")).toBe(false);
    cancel();
  });
});
