import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ParadigmProvider } from "@/theme/ParadigmContext";
import ModeStrip from "../ModeStrip";

const prefetchKineticSpy = vi.hoisted(() => vi.fn());
const prefetchAetherSpy = vi.hoisted(() => vi.fn());

vi.mock("@/theme/ParadigmContext", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/theme/ParadigmContext")>();
  return {
    ...actual,
    useParadigm: () => ({
      ...actual.useParadigm(),
      prefetchKinetic: prefetchKineticSpy,
      prefetchAether: prefetchAetherSpy,
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
    prefetchKineticSpy.mockClear();
    prefetchAetherSpy.mockClear();
  });

  it("renders all three segments in a labelled group; Studio pressed by default", () => {
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
    expect(screen.getByRole("button", { name: "Aether" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("Design")).toBeInTheDocument();
  });

  it("switches across Studio, Kinetic, and Aether and updates aria-pressed and lead label", () => {
    const { container } = renderStrip();
    const studio = screen.getByRole("button", { name: "Studio" });
    const kinetic = screen.getByRole("button", { name: "Kinetic" });
    const aether = screen.getByRole("button", { name: "Aether" });

    fireEvent.click(kinetic);
    expect(kinetic).toHaveAttribute("aria-pressed", "true");
    expect(studio).toHaveAttribute("aria-pressed", "false");
    expect(aether).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem("portfolio-paradigm")).toBe("kinetic");

    fireEvent.click(aether);
    expect(aether).toHaveAttribute("aria-pressed", "true");
    expect(studio).toHaveAttribute("aria-pressed", "false");
    expect(kinetic).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem("portfolio-paradigm")).toBe("aether");
    expect(container.querySelector(".aether-strip-label")).toHaveTextContent(
      "Aether · Observatory",
    );

    fireEvent.click(studio);
    expect(studio).toHaveAttribute("aria-pressed", "true");
    expect(kinetic).toHaveAttribute("aria-pressed", "false");
    expect(aether).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem("portfolio-paradigm")).toBe("studio");
    expect(screen.getByText("Design")).toBeInTheDocument();
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

  it("keeps button nodes and focus across 3-way switches", () => {
    renderStrip();
    const k = screen.getByRole("button", { name: "Kinetic" });
    const a = screen.getByRole("button", { name: "Aether" });
    const s = screen.getByRole("button", { name: "Studio" });

    act(() => k.focus());
    fireEvent.click(k);
    expect(k.isConnected).toBe(true);
    expect(document.activeElement).toBe(k);

    act(() => a.focus());
    fireEvent.click(a);
    expect(a.isConnected).toBe(true);
    expect(document.activeElement).toBe(a);

    act(() => s.focus());
    fireEvent.click(s);
    expect(s.isConnected).toBe(true);
    expect(document.activeElement).toBe(s);
  });

  it("prefetches kinetic or aether only on their respective segments", () => {
    renderStrip();
    const studio = screen.getByRole("button", { name: "Studio" });
    fireEvent.pointerEnter(studio);
    expect(prefetchKineticSpy).not.toHaveBeenCalled();
    expect(prefetchAetherSpy).not.toHaveBeenCalled();

    const k = screen.getByRole("button", { name: "Kinetic" });
    fireEvent.pointerEnter(k);
    fireEvent.focus(k);
    fireEvent.touchStart(k);
    expect(prefetchKineticSpy).toHaveBeenCalledTimes(3);
    expect(prefetchAetherSpy).not.toHaveBeenCalled();

    const a = screen.getByRole("button", { name: "Aether" });
    fireEvent.pointerEnter(a);
    fireEvent.focus(a);
    fireEvent.touchStart(a);
    expect(prefetchAetherSpy).toHaveBeenCalledTimes(3);
    expect(prefetchKineticSpy).toHaveBeenCalledTimes(3);
  });

  it("never shows 'return' wording", () => {
    const { container } = renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Kinetic" }));
    expect(container.textContent).not.toMatch(/return/i);
    fireEvent.click(screen.getByRole("button", { name: "Aether" }));
    expect(container.textContent).not.toMatch(/return/i);
  });

  it("renders without a provider and does not throw", () => {
    expect(() => render(<ModeStrip />)).not.toThrow();
  });
});
