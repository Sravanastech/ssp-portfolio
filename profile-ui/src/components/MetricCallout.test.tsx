import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MetricCallout from "./MetricCallout";

describe("MetricCallout", () => {
  const mockMetrics = {
    metric1: { label: "Challenge", value: "45% bounce rate" },
    metric2: { label: "Solution", value: "70% bundle reduction" },
    metric3: { label: "Impact", value: "95+ Lighthouse" },
  };

  it("renders all three metrics", () => {
    render(<MetricCallout {...mockMetrics} />);

    expect(screen.getByText("Challenge")).toBeInTheDocument();
    expect(screen.getByText("45% bounce rate")).toBeInTheDocument();

    expect(screen.getByText("Solution")).toBeInTheDocument();
    expect(screen.getByText("70% bundle reduction")).toBeInTheDocument();

    expect(screen.getByText("Impact")).toBeInTheDocument();
    expect(screen.getByText("95+ Lighthouse")).toBeInTheDocument();
  });

  it("renders metrics in horizontal layout with flex class", () => {
    const { container } = render(<MetricCallout {...mockMetrics} />);
    const flexContainer = container.querySelector(".flex");

    expect(flexContainer).toBeInTheDocument();
    expect(flexContainer).toHaveClass("flex");
  });

  it("each metric shows label and value", () => {
    render(<MetricCallout {...mockMetrics} />);

    // Check first metric
    const labels = screen.getAllByText(/Challenge|Solution|Impact/);
    const values = screen.getAllByText(
      /bounce rate|bundle reduction|Lighthouse/,
    );

    expect(labels).toHaveLength(3);
    expect(values).toHaveLength(3);
  });
});
