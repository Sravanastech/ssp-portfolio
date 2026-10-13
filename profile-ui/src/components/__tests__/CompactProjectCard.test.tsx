import React from "react";
import { vi, describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import CompactProjectCard from "../CompactProjectCard";
import { ThemeProvider } from "@/theme/ThemeContext";

const mockProject = {
  id: "test-project",
  domain: "Frontend Development",
  description: "Built scalable React components",
  technologies: ["React", "TypeScript", "Tailwind"],
  outcomes: [
    { label: "Improved performance by 40%" },
    { label: "Reduced bundle size by 35%" },
    { label: "Enhanced accessibility to WCAG AA" },
    { label: "This should not render" },
    { label: "Neither should this" },
  ],
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("CompactProjectCard", () => {
  it("should render project domain as heading", () => {
    const { getByText } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );
    expect(getByText("Frontend Development")).toBeInTheDocument();
  });

  it("should render project description", () => {
    const { getByText } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );
    expect(getByText("Built scalable React components")).toBeInTheDocument();
  });

  it("should render technology tags", () => {
    const { getByText } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );
    expect(getByText("React")).toBeInTheDocument();
    expect(getByText("TypeScript")).toBeInTheDocument();
    expect(getByText("Tailwind")).toBeInTheDocument();
  });

  it("should cap outcomes to 3 maximum", () => {
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );
    const listItems = container.querySelectorAll("ul li");
    expect(listItems.length).toBe(3);
  });

  it("should bold the first outcome", () => {
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );
    const listItems = container.querySelectorAll("ul li");
    expect(listItems[0]).toHaveClass("font-bold");
  });

  it("should dim the last outcome", () => {
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );
    const listItems = container.querySelectorAll("ul li");
    expect(listItems[2]).toHaveClass("opacity-60");
  });

  it('should have role="article" on card container', () => {
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );
    const article = container.querySelector('[role="article"]');
    expect(article).toBeInTheDocument();
  });

  it("should have aria-label on card", () => {
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );
    const article = container.querySelector('[role="article"]');
    expect(article).toHaveAttribute(
      "aria-label",
      "Frontend Development project overview",
    );
  });

  it("should not render outcomes if empty", () => {
    const projectNoOutcomes = { ...mockProject, outcomes: [] };
    const { container } = renderWithTheme(
      <CompactProjectCard project={projectNoOutcomes} />,
    );
    const listItems = container.querySelectorAll("ul li");
    expect(listItems.length).toBe(0);
  });

  it("should handle Enter key press on card", () => {
    const onSelect = vi.fn();
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} onSelect={onSelect} />,
    );
    const article = container.querySelector('[role="article"]');

    fireEvent.keyDown(article!, { key: "Enter", code: "Enter" });
    expect(onSelect).toHaveBeenCalled();
  });

  it("should handle Space key press on card", () => {
    const onSelect = vi.fn();
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} onSelect={onSelect} />,
    );
    const article = container.querySelector('[role="article"]');

    fireEvent.keyDown(article!, { key: " ", code: "Space" });
    expect(onSelect).toHaveBeenCalled();
  });

  it("should be focusable with tabIndex", () => {
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );
    const article = container.querySelector('[role="article"]');
    expect(article).toHaveAttribute("tabIndex", "0");
  });

  it("should have focus ring classes", () => {
    const { container } = renderWithTheme(
      <CompactProjectCard project={mockProject} />,
    );
    const article = container.querySelector('[role="article"]');
    expect(article).toHaveClass("focus:ring-2");
  });
});
