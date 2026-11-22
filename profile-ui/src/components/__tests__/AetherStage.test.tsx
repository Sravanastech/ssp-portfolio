import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/theme/ThemeContext";
import { ParadigmProvider, useParadigm } from "@/theme/ParadigmContext";
import AetherStage from "../AetherStage";
import { APPEARANCE_OPEN_EVENT } from "../appearance/appearanceStore";

function ActivateAether() {
  const { setParadigm } = useParadigm();
  return (
    <button type="button" onClick={() => setParadigm("aether")}>
      Activate Aether
    </button>
  );
}

describe("AetherStage (FUI HUD Frame + ⌘K Command Palette)", () => {
  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    delete document.documentElement.dataset.paradigm;
    delete document.documentElement.dataset.fuiTheme;
  });

  it("renders nothing when paradigm is studio", () => {
    localStorage.setItem("portfolio-paradigm", "studio");
    const { container } = render(
      <MemoryRouter>
        <ThemeProvider>
          <ParadigmProvider>
            <AetherStage />
          </ParadigmProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(container.querySelector(".fui-hud-frame")).toBeNull();
  });

  it("mounts the FUI HUD frame, toggles VOID/CLEANROOM, and opens ⌘K Command Palette", () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <ParadigmProvider>
            <ActivateAether />
            <AetherStage />
          </ParadigmProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Activate Aether"));

    expect(screen.getByText(/SYS\.NOMINAL \/\/ 60FPS/i)).toBeInTheDocument();
    expect(document.documentElement.dataset.fuiTheme).toBe("void");

    // The HUD theme control now opens the shared Appearance panel.
    const onOpen = vi.fn();
    window.addEventListener(APPEARANCE_OPEN_EVENT, onOpen);
    fireEvent.click(
      screen.getByRole("button", { name: /open appearance settings/i }),
    );
    window.removeEventListener(APPEARANCE_OPEN_EVENT, onOpen);
    expect(onOpen).toHaveBeenCalledTimes(1);

    // Open ⌘K Command Palette via keyboard shortcut
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(
      screen.getByRole("dialog", { name: /system command palette/i }),
    ).toBeInTheDocument();
  });

  it("migrates the legacy Aether key into the shared theme", () => {
    localStorage.setItem("portfolio-fui-theme", "cleanroom");
    localStorage.setItem("portfolio-paradigm", "aether");
    render(
      <MemoryRouter>
        <ThemeProvider>
          <ParadigmProvider>
            <AetherStage />
          </ParadigmProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(document.documentElement.dataset.fuiTheme).toBe("cleanroom");
    expect(localStorage.getItem("portfolio-fui-theme")).toBeNull();
    expect(localStorage.getItem("theme")).toBe("sunrise");
  });
});
