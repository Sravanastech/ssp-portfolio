import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ParadigmProvider } from "@/theme/ParadigmContext";
import { staticContent } from "@/content/siteContentContext";
import * as aetherAudio from "@/lib/aetherAudio";
import AetherStage from "../AetherStage";

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

function renderStage(paradigm: "studio" | "kinetic" | "aether" = "aether") {
  if (paradigm === "studio") {
    localStorage.removeItem("portfolio-paradigm");
  } else {
    localStorage.setItem("portfolio-paradigm", paradigm);
  }
  return render(
    <ParadigmProvider>
      <AetherStage />
    </ParadigmProvider>,
  );
}

describe("AetherStage", () => {
  const originalAudioContext = window.AudioContext;

  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.perf;
    mockMedia([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.AudioContext = originalAudioContext;
    delete document.documentElement.dataset.perf;
  });

  it("renders nothing when paradigm is studio or kinetic", () => {
    const studio = renderStage("studio");
    expect(studio.container.querySelector(".aether-hud")).toBeNull();
    expect(studio.container.querySelector(".aether-scroll-beam")).toBeNull();
    studio.unmount();

    const kinetic = renderStage("kinetic");
    expect(kinetic.container.querySelector(".aether-hud")).toBeNull();
    expect(kinetic.container.querySelector(".aether-scroll-beam")).toBeNull();
  });

  it("renders beam and telemetry HUD with location and muted sound toggle in aether", () => {
    const audioCtorSpy = vi.fn();
    window.AudioContext = audioCtorSpy as unknown as typeof AudioContext;

    const { container } = renderStage("aether");

    expect(container.querySelector(".aether-scroll-beam")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    const hud = screen.getByRole("region", {
      name: /aether observatory telemetry/i,
    });
    expect(hud).toHaveClass("aether-hud");
    expect(hud).toHaveTextContent(staticContent.profile.location);
    expect(hud).toHaveTextContent("00%");

    const toggle = screen.getByRole("button", {
      name: /enable aether soundscape/i,
    });
    expect(toggle).toHaveClass("aether-hud-btn");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(audioCtorSpy).not.toHaveBeenCalled();
  });

  it("toggles sound button aria-pressed between false and true and plays chime on enable", () => {
    const chimeSpy = vi.spyOn(aetherAudio, "playSwitchChime");
    const enableSpy = vi.spyOn(aetherAudio, "enable");

    renderStage("aether");
    const toggle = screen.getByRole("button", {
      name: /enable aether soundscape/i,
    });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAttribute("aria-label", "Mute Aether soundscape");
    expect(enableSpy).toHaveBeenCalledTimes(1);
    expect(chimeSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("aria-label", "Enable Aether soundscape");
    expect(chimeSpy).toHaveBeenCalledTimes(1);
  });

  it("updates --glow-x and --glow-y on fine pointer move via RAF and skips lite tier", () => {
    mockMedia(["(pointer: fine)"]);
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");

    const card = document.createElement("article");
    card.className = "studio-project";
    const inner = document.createElement("span");
    card.appendChild(inner);
    card.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 50,
        width: 200,
        height: 150,
        right: 300,
        bottom: 200,
        x: 100,
        y: 50,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(card);

    const { unmount } = renderStage("aether");

    act(() => {
      inner.dispatchEvent(
        new MouseEvent("pointermove", {
          bubbles: true,
          clientX: 120,
          clientY: 70,
        }),
      );
      inner.dispatchEvent(
        new MouseEvent("pointermove", {
          bubbles: true,
          clientX: 145,
          clientY: 90,
        }),
      );
    });
    // One RAF frame queued for multiple moves
    expect(frames).toHaveLength(1);
    act(() => frames[0](0));

    expect(card.style.getPropertyValue("--glow-x")).toBe("45px");
    expect(card.style.getPropertyValue("--glow-y")).toBe("40px");

    unmount();
    expect(cancelSpy).not.toThrow();
    card.remove();

    // Lite perf tier should not register pointermove listener
    document.documentElement.dataset.perf = "lite";
    const addSpy = vi.spyOn(window, "addEventListener");
    const liteRender = renderStage("aether");
    expect(addSpy.mock.calls.some(([type]) => type === "pointermove")).toBe(
      false,
    );
    liteRender.unmount();
  });

  it("throttles hover tick audio to at most once per 90ms when sound is enabled", () => {
    vi.spyOn(aetherAudio, "enable").mockReturnValue(true);
    vi.spyOn(aetherAudio, "playSwitchChime").mockImplementation(
      () => undefined,
    );
    const tickSpy = vi
      .spyOn(aetherAudio, "playHoverTick")
      .mockImplementation(() => undefined);

    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    renderStage("aether");
    const toggle = screen.getByRole("button", {
      name: /enable aether soundscape/i,
    });
    fireEvent.click(toggle);

    const link = document.createElement("a");
    document.body.appendChild(link);

    act(() => {
      link.dispatchEvent(new Event("pointerenter"));
    });
    expect(tickSpy).toHaveBeenCalledTimes(1);

    now = 1050;
    act(() => {
      link.dispatchEvent(new Event("pointerenter"));
    });
    expect(tickSpy).toHaveBeenCalledTimes(1);

    now = 1100;
    act(() => {
      link.dispatchEvent(new Event("pointerenter"));
    });
    expect(tickSpy).toHaveBeenCalledTimes(2);

    link.remove();
  });

  it("updates scroll depth percentage via passive RAF scroll listener", () => {
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

    renderStage("aether");
    const hud = screen.getByRole("region", {
      name: /aether observatory telemetry/i,
    });
    expect(hud).toHaveTextContent("00%");

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
    expect(hud).toHaveTextContent("50%");
  });

  it("never throws when AudioContext is unavailable or blocked", () => {
    // @ts-expect-error simulating browser without AudioContext
    delete window.AudioContext;
    expect(() => aetherAudio.enable()).not.toThrow();
    expect(() => aetherAudio.playHoverTick()).not.toThrow();
    expect(() => aetherAudio.playSwitchChime()).not.toThrow();

    window.AudioContext = vi.fn().mockImplementation(function BlockedAudio() {
      throw new Error("Audio blocked");
    }) as unknown as typeof AudioContext;
    expect(() => aetherAudio.enable()).not.toThrow();
    expect(() => aetherAudio.playHoverTick()).not.toThrow();
    expect(() => aetherAudio.playSwitchChime()).not.toThrow();
  });
});
