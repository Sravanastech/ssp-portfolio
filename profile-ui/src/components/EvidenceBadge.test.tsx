import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EvidenceBadge from "./EvidenceBadge";

describe("EvidenceBadge", () => {
  it("renders label only when value is undefined", () => {
    render(<EvidenceBadge label="React" />);
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("renders label and value when both provided", () => {
    render(<EvidenceBadge label="Lighthouse" value="95+" />);
    expect(screen.getByText("Lighthouse")).toBeInTheDocument();
    expect(screen.getByText("95+")).toBeInTheDocument();
  });

  it("renders with theme colors applied", () => {
    const { container } = render(<EvidenceBadge label="Test" />);
    const badgeElement = container.firstChild as HTMLElement;
    expect(badgeElement).toHaveAttribute("style");
    expect(badgeElement.getAttribute("style")).toContain("background-color");
  });

  it("applies custom className", () => {
    const { container } = render(
      <EvidenceBadge label="Test" className="custom-class" />,
    );
    const badgeElement = container.firstChild;
    expect(badgeElement).toHaveClass("custom-class");
  });
});
