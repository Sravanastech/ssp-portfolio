import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/theme/ThemeContext";
import { ParadigmProvider } from "@/theme/ParadigmContext";
import AppearancePanel from "../AppearancePanel";
import AppearanceTrigger from "../AppearanceTrigger";
import { APPEARANCE_OPEN_EVENT, closeAppearance } from "../appearanceStore";

type Listener = (e: { matches: boolean }) => void;
const listeners = new Map<string, Listener[]>();

/** matchMedia stub: `matches` decides per query; listeners are kept so tests can fire changes. */
function mockMedia(matches: (query: string) => boolean) {
  listeners.clear();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matches(query),
    media: query,
    addEventListener: (_: string, l: Listener) =>
      listeners.set(query, [...(listeners.get(query) ?? []), l]),
    removeEventListener: (_: string, l: Listener) =>
      listeners.set(
        query,
        (listeners.get(query) ?? []).filter((x) => x !== l),
      ),
  })) as unknown as typeof window.matchMedia;
}

const renderPanel = () =>
  render(
    <ThemeProvider>
      <ParadigmProvider>
        <AppearanceTrigger />
        <AppearancePanel />
      </ParadigmProvider>
    </ThemeProvider>,
  );

const trigger = () => screen.getByRole("button", { name: "Appearance" });
const openPanel = () => fireEvent.click(trigger());

describe("AppearancePanel", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.motion;
    delete document.documentElement.dataset.paradigm;
    mockMedia(() => false);
  });
  afterEach(() => {
    act(() => closeAppearance());
    vi.restoreAllMocks();
  });

  it("opens from the trigger, labelled Appearance, and moves focus inside", () => {
    renderPanel();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    openPanel();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: "Appearance" });
    expect(trigger()).toHaveAttribute("aria-controls", dialog.id);
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(dialog).not.toHaveAttribute("aria-modal");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    renderPanel();
    openPanel();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on outside click without stealing focus", () => {
    renderPanel();
    openPanel();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger()).not.toHaveFocus();
  });

  it("opens through APPEARANCE_OPEN_EVENT", () => {
    renderPanel();
    act(() => {
      window.dispatchEvent(new Event(APPEARANCE_OPEN_EVENT));
    });
    expect(screen.getByRole("dialog", { name: "Appearance" })).toBeVisible();
  });

  it("is a modal bottom sheet on small or coarse screens and traps focus", () => {
    mockMedia((q) => q.includes("max-width: 640px"));
    renderPanel();
    openPanel();
    const dialog = screen.getByRole("dialog", { name: "Appearance" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("data-presentation", "sheet");
    const close = screen.getByRole("button", { name: "Close panel" });
    const reset = screen.getByRole("button", { name: "Reset to defaults" });
    reset.focus();
    fireEvent.keyDown(reset, { key: "Tab" });
    expect(document.activeElement).not.toBe(reset);
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    close.focus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(reset).toHaveFocus();
  });

  it("selecting a style radio switches paradigm and storage", () => {
    renderPanel();
    openPanel();
    const group = screen.getByRole("radiogroup", { name: "Style" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Studio" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Aether" }));
    expect(localStorage.getItem("portfolio-paradigm")).toBe("aether");
    expect(document.documentElement.dataset.paradigm).toBe("aether");
    expect(screen.getByRole("radio", { name: "Aether" })).toBeChecked();
  });

  it("selecting a theme radio stores light, dark and system", () => {
    renderPanel();
    openPanel();
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(localStorage.getItem("theme")).toBe("midnight");
    expect(document.documentElement.dataset.theme).toBe("midnight");
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(localStorage.getItem("theme")).toBe("sunrise");
    fireEvent.click(screen.getByRole("radio", { name: "System" }));
    expect(localStorage.getItem("theme")).toBe("system");
  });

  it("System resolves from the OS and follows live changes", () => {
    mockMedia((q) => q.includes("prefers-color-scheme"));
    localStorage.setItem("theme", "system");
    renderPanel();
    expect(document.documentElement.dataset.theme).toBe("midnight");
    act(() => {
      (listeners.get("(prefers-color-scheme: dark)") ?? []).forEach((l) =>
        l({ matches: false }),
      );
    });
    expect(document.documentElement.dataset.theme).toBe("sunrise");
  });

  it("the motion switch sets html[data-motion] and storage", () => {
    renderPanel();
    openPanel();
    const sw = screen.getByRole("switch", { name: "Reduce motion" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.motion).toBe("reduced");
    expect(localStorage.getItem("portfolio-motion")).toBe("reduced");
    fireEvent.click(sw);
    expect(document.documentElement.dataset.motion).toBeUndefined();
    expect(localStorage.getItem("portfolio-motion")).toBeNull();
  });

  it("OS reduced motion shows the switch on, disabled, with a hint", () => {
    mockMedia((q) => q.includes("prefers-reduced-motion"));
    renderPanel();
    openPanel();
    const sw = screen.getByRole("switch", { name: "Reduce motion" });
    expect(sw).toBeChecked();
    expect(sw).toBeDisabled();
    expect(screen.getByText("Set by your device")).toBeInTheDocument();
  });

  it("Reset to defaults restores Studio, system theme and motion", () => {
    localStorage.setItem("theme", "midnight");
    localStorage.setItem("portfolio-motion", "reduced");
    localStorage.setItem("portfolio-paradigm", "kinetic");
    renderPanel();
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect(localStorage.getItem("portfolio-paradigm")).toBe("studio");
    expect(localStorage.getItem("theme")).toBeNull();
    expect(localStorage.getItem("portfolio-motion")).toBeNull();
    expect(screen.getByRole("radio", { name: "Studio" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    expect(
      screen.getByRole("switch", { name: "Reduce motion" }),
    ).not.toBeChecked();
  });

  it("shows the discovery dot until the panel is opened once", () => {
    const { unmount } = renderPanel();
    expect(screen.getByTestId("appearance-hint")).toBeInTheDocument();
    openPanel();
    expect(screen.queryByTestId("appearance-hint")).toBeNull();
    expect(localStorage.getItem("appearance-seen")).toBe("1");
    unmount();
    renderPanel();
    expect(screen.queryByTestId("appearance-hint")).toBeNull();
  });
});
