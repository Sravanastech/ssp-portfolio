import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CaseStudyCard from "./CaseStudyCard";

describe("CaseStudyCard", () => {
  const mockProps = {
    image: "/images/kroger.jpg",
    company: "Kroger",
    role: "Technical Lead",
    metrics: {
      metric1: { label: "Challenge", value: "45% bounce rate" },
      metric2: { label: "Solution", value: "70% bundle reduction" },
      metric3: { label: "Impact", value: "95+ Lighthouse" },
    },
    challenge: "Legacy system with poor performance causing high bounce rates.",
    solution: "Implemented code splitting and lazy loading strategies.",
    impact: ["60% load time reduction", "95+ Lighthouse score"],
    technologies: ["React", "TypeScript", "Webpack"],
  };

  it("renders company and role on card face", () => {
    render(<CaseStudyCard {...mockProps} />);

    expect(screen.getByText("Kroger")).toBeInTheDocument();
    expect(screen.getByText("Technical Lead")).toBeInTheDocument();
  });

  it("displays metric callout on card face", () => {
    render(<CaseStudyCard {...mockProps} />);

    expect(screen.getByText("Challenge")).toBeInTheDocument();
    expect(screen.getByText("45% bounce rate")).toBeInTheDocument();
    expect(screen.getByText("Solution")).toBeInTheDocument();
    expect(screen.getByText("70% bundle reduction")).toBeInTheDocument();
    expect(screen.getByText("Impact")).toBeInTheDocument();
    expect(screen.getByText("95+ Lighthouse")).toBeInTheDocument();
  });

  it("renders expand button", () => {
    render(<CaseStudyCard {...mockProps} />);

    const expandButton = screen.getByRole("button");
    expect(expandButton).toBeInTheDocument();
    expect(screen.getByText("View Details")).toBeInTheDocument();
  });

  it("shows expanded details when expanded=true", () => {
    render(<CaseStudyCard {...mockProps} expanded={true} />);

    expect(
      screen.getByText(
        "Legacy system with poor performance causing high bounce rates.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Implemented code splitting and lazy loading strategies.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("60% load time reduction")).toBeInTheDocument();
    expect(screen.getByText("95+ Lighthouse score")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Webpack")).toBeInTheDocument();
  });

  it("initializes with expanded=true and shows Hide Details", () => {
    render(<CaseStudyCard {...mockProps} expanded={true} />);

    expect(screen.getByText("Hide Details")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Legacy system with poor performance causing high bounce rates.",
      ),
    ).toBeInTheDocument();
  });

  it("initializes with expanded=false by default and shows View Details", () => {
    render(<CaseStudyCard {...mockProps} />);

    expect(screen.getByText("View Details")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Legacy system with poor performance causing high bounce rates.",
      ),
    ).not.toBeInTheDocument();
  });

  it("displays image with correct src", () => {
    render(<CaseStudyCard {...mockProps} />);

    const image = screen.getByAltText(/Kroger|case study/i);
    expect(image).toHaveAttribute("src", "/images/kroger.jpg");
  });

  it("renders all technologies as badges", () => {
    render(<CaseStudyCard {...mockProps} expanded={true} />);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Webpack")).toBeInTheDocument();
  });

  it("renders all impact items as bullet list", () => {
    render(<CaseStudyCard {...mockProps} expanded={true} />);

    const impactItems = screen.getAllByText(
      /60% load time reduction|95\+ Lighthouse score/,
    );
    expect(impactItems.length).toBeGreaterThanOrEqual(2);
  });
});
