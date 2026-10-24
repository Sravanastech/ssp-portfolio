import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ParadigmProvider } from "@/theme/ParadigmContext";
import ParadigmToggle from "../ParadigmToggle";

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

describe("ParadigmToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    prefetchSpy.mockClear();
  });

  it("renders accessible toggle button with aria-pressed=false in studio mode", () => {
    render(
      <ParadigmProvider>
        <ParadigmToggle />
      </ParadigmProvider>,
    );
    const btn = screen.getByRole("button", {
      name: /switch to kinetic maximalist mode/i,
    });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveTextContent(/Kinetic/i);
    expect(btn).toHaveClass("paradigm-toggle");
  });

  it("flips to kinetic mode on click and updates aria-pressed and label", () => {
    render(
      <ParadigmProvider>
        <ParadigmToggle />
      </ParadigmProvider>,
    );
    const btn = screen.getByRole("button", {
      name: /switch to kinetic maximalist mode/i,
    });
    fireEvent.click(btn);
    expect(
      screen.getByRole("button", {
        name: /switch to studio minimalist mode/i,
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the same button node and focus across toggles", () => {
    render(
      <ParadigmProvider>
        <ParadigmToggle />
      </ParadigmProvider>,
    );
    const btn = screen.getByRole("button", { name: /kinetic/i });
    act(() => btn.focus());
    fireEvent.click(btn);
    expect(btn.isConnected).toBe(true);
    expect(document.activeElement).toBe(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(btn);
    expect(document.activeElement).toBe(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("prefetches kinetic on pointer enter, focus and touch start", () => {
    render(
      <ParadigmProvider>
        <ParadigmToggle />
      </ParadigmProvider>,
    );
    const btn = screen.getByRole("button", { name: /kinetic/i });
    fireEvent.pointerEnter(btn);
    fireEvent.focus(btn);
    fireEvent.touchStart(btn);
    expect(prefetchSpy).toHaveBeenCalledTimes(3);
  });

  it("renders icon-only in compact mode while keeping the accessible name", () => {
    render(
      <ParadigmProvider>
        <ParadigmToggle compact />
      </ParadigmProvider>,
    );
    const btn = screen.getByRole("button", {
      name: /switch to kinetic maximalist mode/i,
    });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn.textContent).toBe("");
  });

  it("renders without a provider and does not throw", () => {
    expect(() => render(<ParadigmToggle />)).not.toThrow();
  });
});
