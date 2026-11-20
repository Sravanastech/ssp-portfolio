import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AetherHomeStage from "../AetherHomeStage";
import { staticContent } from "@/content/siteContentContext";

describe("AetherHomeStage (Take 3 — Movie Credits Title Sequence)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderStage = () =>
    render(
      <MemoryRouter>
        <AetherHomeStage />
      </MemoryRouter>,
    );

  it("renders the opening title card with real profile name and role", () => {
    renderStage();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: staticContent.profile.name,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/A PORTFOLIO BY/i)).toBeInTheDocument();
  });

  it("renders the thesis card with the full aligned headline (no scattered word spans)", () => {
    const { container } = renderStage();
    const thesisHeading = container.querySelector("#aether-thesis-title");
    expect(thesisHeading).toHaveTextContent(staticContent.profile.headline);
    expect(container.querySelectorAll(".aether-word")).toHaveLength(0);
  });

  it("renders a dedicated full-screen feature card for each of the 5 case studies with /work/:slug links", () => {
    const { container } = renderStage();
    for (const study of staticContent.caseStudies) {
      const heading = container.querySelector(`#aether-work-${study.id} a`);
      expect(heading).toHaveTextContent(study.name);
      expect(heading).toHaveAttribute("href", `/work/${study.slug}`);
    }
  });

  it("renders the two-column Hollywood end-credits roll for all real employers", () => {
    const { container } = renderStage();
    const rows = container.querySelectorAll(".aether-credits-roll li");
    expect(rows).toHaveLength(staticContent.experiences.length);
    for (const exp of staticContent.experiences) {
      expect(screen.getAllByText(exp.company).length).toBeGreaterThan(0);
    }
  });

  it("renders the finale CTA and interactive chapter scrubber ticks", () => {
    const scrollToSpy = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);
    const { container } = renderStage();

    expect(container.querySelector("#aether-finale-title")).toHaveTextContent(
      /Hiring for a senior engineering role/i,
    );

    const scrubberNav = screen.getByRole("navigation", {
      name: /title sequence chapters/i,
    });
    const ticks = scrubberNav.querySelectorAll("button.aether-tick");
    expect(ticks).toHaveLength(staticContent.caseStudies.length + 4);

    fireEvent.click(ticks[2]);
    expect(scrollToSpy).toHaveBeenCalled();
  });
});
