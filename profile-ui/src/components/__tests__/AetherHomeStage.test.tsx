import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AetherHomeStage from "../AetherHomeStage";
import { FUI_OPEN_COMMAND_EVENT } from "../AetherStage";
import { staticContent } from "@/content/siteContentContext";

describe("AetherHomeStage (FUI Minimalism Boot Sequence & Bento Grid)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderStage = () =>
    render(
      <MemoryRouter>
        <AetherHomeStage />
      </MemoryRouter>,
    );

  it("renders the Boot Sequence hero with ⌘K trigger dispatching fui:open-command", () => {
    const listener = vi.fn();
    window.addEventListener(FUI_OPEN_COMMAND_EVENT, listener);
    renderStage();

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    const cmdBtn = screen.getByRole("button", {
      name: /press ⌘k for system menu/i,
    });
    fireEvent.click(cmdBtn);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(FUI_OPEN_COMMAND_EVENT, listener);
  });

  it("keeps the hero heading accessible name equal to the real headline and replay button named by visible text", () => {
    renderStage();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: staticContent.profile.headline,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /replay boot/i }),
    ).toBeInTheDocument();
  });

  it("renders all 5 Mission Modules in the chamfered Bento Grid and opens the Dossier Modal", () => {
    renderStage();
    for (let i = 0; i < staticContent.caseStudies.length; i++) {
      expect(
        screen.getByText(`PRJ // ${String(i + 1).padStart(2, "0")}`),
      ).toBeInTheDocument();
    }

    const dossierButtons = screen.getAllByRole("button", {
      name: /open technical dossier/i,
    });
    expect(dossierButtons).toHaveLength(staticContent.caseStudies.length);

    fireEvent.click(dossierButtons[0]);
    expect(
      screen.getByRole("dialog", {
        name: staticContent.caseStudies[0].name,
      }),
    ).toBeInTheDocument();
  });

  it("renders all 6 employers in the Career Telemetry timeline", () => {
    const { container } = renderStage();
    const rows = container.querySelectorAll(".fui-timeline-row");
    expect(rows).toHaveLength(staticContent.experiences.length);
  });
});
