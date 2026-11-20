import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AetherHomeStage from "../AetherHomeStage";
import { FUI_OPEN_COMMAND_EVENT } from "../AetherStage";
import { staticContent } from "@/content/siteContentContext";

describe("AetherHomeStage (FUI Minimalism Boot Sequence & Bento Grid)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
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

  describe("session-scoped skippable boot", () => {
    it("plays the full boot on first visit and skips it on the second render in the session", () => {
      const first = renderStage();
      expect(first.container.querySelector(".fui-page")).toHaveAttribute(
        "data-boot",
        "full",
      );
      expect(
        screen.getByRole("button", { name: /skip intro/i }),
      ).toBeInTheDocument();
      first.unmount();

      const second = renderStage();
      expect(second.container.querySelector(".fui-page")).toHaveAttribute(
        "data-boot",
        "quick",
      );
      expect(
        screen.queryByRole("button", { name: /skip intro/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /replay boot/i }),
      ).toBeInTheDocument();
    });

    it("treats a throwing sessionStorage as a first visit", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      const { container } = renderStage();
      expect(container.querySelector(".fui-page")).toHaveAttribute(
        "data-boot",
        "full",
      );
    });

    it("shows Skip intro first in the hero tab order and removes it on click", () => {
      const { container } = renderStage();
      const hero = container.querySelector(".fui-hero") as HTMLElement;
      const firstButton = hero.querySelector("button");
      expect(firstButton).toHaveTextContent(/skip intro/i);

      fireEvent.click(screen.getByRole("button", { name: /skip intro/i }));
      expect(container.querySelector(".fui-page")).toHaveAttribute(
        "data-boot",
        "skipped",
      );
      expect(
        screen.queryByRole("button", { name: /skip intro/i }),
      ).not.toBeInTheDocument();
    });

    it("skips on Escape", () => {
      const { container } = renderStage();
      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });
      expect(container.querySelector(".fui-page")).toHaveAttribute(
        "data-boot",
        "skipped",
      );
    });

    it("does not steal focus or skip when Escape closes a dialog during boot", () => {
      const { container } = renderStage();
      fireEvent.click(
        screen.getAllByRole("button", { name: /open technical dossier/i })[0],
      );
      // Opening the dossier ends the boot without moving focus.
      expect(container.querySelector(".fui-page")).toHaveAttribute(
        "data-boot",
        "skipped",
      );
      expect(screen.getByRole("button", { name: /replay boot/i })).not.toBe(
        document.activeElement,
      );
      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });
      expect(screen.getByRole("button", { name: /replay boot/i })).not.toBe(
        document.activeElement,
      );
    });

    it("ignores Escape that is already default-prevented", () => {
      const { container } = renderStage();
      act(() => {
        const ev = new KeyboardEvent("keydown", {
          key: "Escape",
          cancelable: true,
        });
        ev.preventDefault();
        window.dispatchEvent(ev);
      });
      expect(container.querySelector(".fui-page")).toHaveAttribute(
        "data-boot",
        "full",
      );
    });

    it("keeps the h1 accessible name unchanged while booting and after skip", () => {
      renderStage();
      const name = staticContent.profile.headline;
      expect(
        screen.getByRole("heading", { level: 1, name }),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /skip intro/i }));
      expect(
        screen.getByRole("heading", { level: 1, name }),
      ).toBeInTheDocument();
    });

    it("replay restarts the full sequence", () => {
      const { container } = renderStage();
      fireEvent.click(screen.getByRole("button", { name: /skip intro/i }));
      fireEvent.click(screen.getByRole("button", { name: /replay boot/i }));
      expect(container.querySelector(".fui-page")).toHaveAttribute(
        "data-boot",
        "full",
      );
      expect(
        screen.getByRole("button", { name: /skip intro/i }),
      ).toBeInTheDocument();
    });
  });
});
