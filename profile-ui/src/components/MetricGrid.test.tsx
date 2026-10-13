import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MetricGrid from "./MetricGrid";

describe("MetricGrid", () => {
  const mockMetrics = [
    { value: "11+", label: "Years Experience" },
    { value: "5+", label: "Companies" },
    { value: "10M+", label: "Users Served" },
    { value: "8+", label: "Engineers Mentored" },
  ];

  it("renders all metrics", () => {
    render(<MetricGrid metrics={mockMetrics} />);

    mockMetrics.forEach((metric) => {
      expect(screen.getByText(metric.value)).toBeInTheDocument();
      expect(screen.getByText(metric.label)).toBeInTheDocument();
    });
  });

  it("uses grid layout with grid class", () => {
    const { container } = render(<MetricGrid metrics={mockMetrics} />);

    const gridContainer = container.querySelector(".grid");
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass("grid");
  });
});
