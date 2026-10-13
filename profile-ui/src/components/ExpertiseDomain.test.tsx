import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ExpertiseDomain from "./ExpertiseDomain";

describe("ExpertiseDomain", () => {
  const mockSkills = ["React", "Next.js", "TypeScript"];

  it("renders domain title", () => {
    render(<ExpertiseDomain domain="Frontend" skills={mockSkills} />);
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("renders all skills as badges", () => {
    render(<ExpertiseDomain domain="Backend" skills={mockSkills} />);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("skills are displayed in flex grid with flex-wrap", () => {
    const { container } = render(
      <ExpertiseDomain domain="Frontend" skills={mockSkills} />,
    );

    const skillsContainer = container.querySelector(".flex");
    expect(skillsContainer).toBeInTheDocument();
    expect(skillsContainer).toHaveClass("flex");
    expect(skillsContainer).toHaveClass("flex-wrap");
  });
});
