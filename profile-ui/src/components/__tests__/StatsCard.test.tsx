import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatsCard from "../StatsCard";
import { ThemeProvider } from "@/theme/ThemeContext";
import { mockStats } from "@/test/fixtures/homePageFixtures";

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("StatsCard", () => {
  it("should render all stats", () => {
    renderWithTheme(<StatsCard stats={mockStats} />);

    mockStats.forEach((stat) => {
      expect(screen.getByText(stat.number)).toBeInTheDocument();
      expect(screen.getByText(stat.label)).toBeInTheDocument();
    });
  });

  it("should have accessible region role", () => {
    const { container } = renderWithTheme(<StatsCard stats={mockStats} />);

    const region = container.querySelector('[role="region"]');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-label", "Key statistics");
  });

  it("should have article role on each stat", () => {
    const { container } = renderWithTheme(<StatsCard stats={mockStats} />);

    const articles = container.querySelectorAll('[role="article"]');
    expect(articles).toHaveLength(mockStats.length);
  });

  it("should have responsive grid (3 columns on desktop)", () => {
    const { container } = renderWithTheme(<StatsCard stats={mockStats} />);

    const gridContainer = container.querySelector(".grid");
    expect(gridContainer).toHaveClass("grid-cols-3");
  });

  it("should have aria-labels with stat data", () => {
    const { container } = renderWithTheme(<StatsCard stats={mockStats} />);

    const articles = container.querySelectorAll('[role="article"]');
    articles.forEach((article, idx) => {
      const expectedLabel = `${mockStats[idx].number} ${mockStats[idx].label}`;
      expect(article).toHaveAttribute("aria-label", expectedLabel);
    });
  });

  it("should render with correct stat values from props", () => {
    const customStats = [
      { number: "20+", label: "Years" },
      { number: "100+", label: "Projects" },
    ];

    renderWithTheme(<StatsCard stats={customStats} />);

    expect(screen.getByText("20+")).toBeInTheDocument();
    expect(screen.getByText("100+")).toBeInTheDocument();
  });

  it("should render stats container with proper id", () => {
    const { container } = renderWithTheme(<StatsCard stats={mockStats} />);

    const statsContainer = container.querySelector("#stats-container");
    expect(statsContainer).toBeInTheDocument();
  });
});
