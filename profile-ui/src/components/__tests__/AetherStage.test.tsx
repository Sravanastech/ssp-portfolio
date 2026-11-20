import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ParadigmProvider, useParadigm } from "@/theme/ParadigmContext";
import AetherStage from "../AetherStage";

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
    delete document.documentElement.dataset.paradigm;
    delete document.documentElement.dataset.fuiTheme;
  });

  it("renders nothing when paradigm is studio", () => {
    const { container } = render(
      <MemoryRouter>
        <ParadigmProvider>
          <AetherStage />
        </ParadigmProvider>
      </MemoryRouter>,
    );
    expect(container.querySelector(".fui-hud-frame")).toBeNull();
  });

  it("mounts the FUI HUD frame, toggles VOID/CLEANROOM, and opens ⌘K Command Palette", () => {
    render(
      <MemoryRouter>
        <ParadigmProvider>
          <ActivateAether />
          <AetherStage />
        </ParadigmProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Activate Aether"));

    expect(screen.getByText(/SYS\.NOMINAL \/\/ 60FPS/i)).toBeInTheDocument();
    expect(document.documentElement.dataset.fuiTheme).toBe("void");

    // Toggle VOID -> CLEANROOM
    const themeSwitch = screen.getByRole("switch", {
      name: /toggle fui theme/i,
    });
    expect(themeSwitch).toHaveAttribute("aria-checked", "false");
    fireEvent.click(themeSwitch);
    expect(themeSwitch).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.fuiTheme).toBe("cleanroom");
    expect(localStorage.getItem("portfolio-fui-theme")).toBe("cleanroom");

    // Open ⌘K Command Palette via keyboard shortcut
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(
      screen.getByRole("dialog", { name: /system command palette/i }),
    ).toBeInTheDocument();
  });
});
