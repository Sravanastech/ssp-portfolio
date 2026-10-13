import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CompactProjectCard from "./CompactProjectCard";
import type { WorkProject } from "@/data/workProjects";
import { ThemeProvider } from "@/theme/ThemeContext";

describe("CompactProjectCard", () => {
  const mockProject: WorkProject = {
    id: "test-project",
    domain: "Scalable Financial Services",
    technologies: ["React", "TypeScript", "Node.js"],
    description:
      "Built a secure payment processing system handling millions of transactions.",
    outcomes: [
      { label: "Zero-downtime deployments" },
      { label: "Multi-tenant authentication" },
      { label: "Database optimization" },
    ],
  };

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  it("renders domain as heading", () => {
    renderWithTheme(<CompactProjectCard project={mockProject} />);

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Scalable Financial Services");
  });

  it("renders description", () => {
    renderWithTheme(<CompactProjectCard project={mockProject} />);

    expect(
      screen.getByText(
        "Built a secure payment processing system handling millions of transactions.",
      ),
    ).toBeInTheDocument();
  });

  it("renders all technologies as tags", () => {
    renderWithTheme(<CompactProjectCard project={mockProject} />);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
  });

  it("renders all outcomes as bullet points", () => {
    renderWithTheme(<CompactProjectCard project={mockProject} />);

    expect(screen.getByText("Zero-downtime deployments")).toBeInTheDocument();
    expect(screen.getByText("Multi-tenant authentication")).toBeInTheDocument();
    expect(screen.getByText("Database optimization")).toBeInTheDocument();
  });

  it("applies correct card styling classes", () => {
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );

    const cardElement = container.querySelector('[role="article"]');
    expect(cardElement).toBeInTheDocument();
    expect(cardElement).toHaveClass("border", "rounded-lg", "p-6");
  });

  it("renders domain heading with primary color", () => {
    renderWithTheme(<CompactProjectCard project={mockProject} />);

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveAttribute("style");
    expect(heading.getAttribute("style")).toContain("color");
  });

  it("applies correct text styling to description", () => {
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );

    const descriptions = container.querySelectorAll(".text-sm");
    expect(descriptions.length).toBeGreaterThan(0);
  });

  it("renders technology tags with monospace font and correct styling", () => {
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );

    const techTags = container.querySelectorAll(".font-mono.text-xs.px-2.py-1");
    expect(techTags.length).toBe(3);
  });

  it("handles empty outcomes gracefully", () => {
    const projectWithNoOutcomes = {
      ...mockProject,
      outcomes: [],
    };

    renderWithTheme(<CompactProjectCard project={projectWithNoOutcomes} />);

    expect(screen.getByText(mockProject.domain)).toBeInTheDocument();
    expect(screen.getByText(mockProject.description)).toBeInTheDocument();
  });

  it("renders outcome bullets as list items", () => {
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );

    const listItems = container.querySelectorAll("li");
    expect(listItems.length).toBe(3);
  });
});
