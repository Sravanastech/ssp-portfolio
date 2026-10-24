import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ParadigmProvider } from "@/theme/ParadigmContext";
import ModeStrip from "../ModeStrip";

const prefetchSpy = vi.hoisted(() => vi.fn());

vi.mock("@/theme/ParadigmContext", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/theme/ParadigmContext")>();
  return {
    ...actual,
    useParadigm: () => ({
      ...actual.useParadigm(),
      prefetchKinetic: prefetchSpy,
    }),
  };
});

const renderStrip = () =>
  render(
    <ParadigmProvider>
      <ModeStrip />
    </ParadigmProvider>,
  );

describe("ModeStrip", () => {
  beforeEach(() => {
    localStorage.clear();
    prefetchSpy.mockClear();
  });

  it("renders both segments in a labelled group; Studio pressed by default", () => {
    const { container } = renderStrip();
    expect(
      screen.getByRole("group", { name: "Site design" }),
    ).toBeInTheDocument();
    expect(container.querySelector(".mode-strip")).toHaveAttribute(
      "data-paradigm-ui",
    );
    expect(screen.getByRole("button", { name: "Studio" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Kinetic" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("Design")).toBeInTheDocument();
  });

  it("switches on click and flips aria-pressed", () => {
    renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Kinetic" }));
    expect(screen.getByRole("button", { name: "Kinetic" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Studio" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(localStorage.getItem("portfolio-paradigm")).toBe("kinetic");
  });

  it("clicking the active segment does nothing", () => {
    renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Studio" }));
    expect(screen.getByRole("button", { name: "Studio" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem("portfolio-paradigm")).toBeNull();
  });

  it("keeps button nodes and focus across toggles", () => {
    renderStrip();
    const k = screen.getByRole("button", { name: "Kinetic" });
    act(() => k.focus());
    fireEvent.click(k);
    expect(k.isConnected).toBe(true);
    expect(document.activeElement).toBe(k);
    const s = screen.getByRole("button", { name: "Studio" });
    act(() => s.focus());
    fireEvent.click(s);
    expect(document.activeElement).toBe(s);
  });

  it("prefetches kinetic on hover, focus and touch of the Kinetic segment only", () => {
    renderStrip();
    const studio = screen.getByRole("button", { name: "Studio" });
    fireEvent.pointerEnter(studio);
    expect(prefetchSpy).not.toHaveBeenCalled();
    const k = screen.getByRole("button", { name: "Kinetic" });
    fireEvent.pointerEnter(k);
    fireEvent.focus(k);
    fireEvent.touchStart(k);
    expect(prefetchSpy).toHaveBeenCalledTimes(3);
  });

  it("never shows 'return' wording", () => {
    const { container } = renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Kinetic" }));
    expect(container.textContent).not.toMatch(/return/i);
  });

  it("renders without a provider and does not throw", () => {
    expect(() => render(<ModeStrip />)).not.toThrow();
  });
});
