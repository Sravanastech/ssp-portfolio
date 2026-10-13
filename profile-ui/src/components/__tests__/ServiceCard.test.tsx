import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ServiceCard from "../ServiceCard";
import { ThemeProvider } from "@/theme/ThemeContext";
import { mockServiceCard } from "@/test/fixtures/componentFixtures";

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("ServiceCard", () => {
  it("should render with title", () => {
    renderWithTheme(
      <ServiceCard
        icon={mockServiceCard.icon}
        title="Test Service"
        description="Test description"
      />,
    );

    expect(screen.getByText("Test Service")).toBeInTheDocument();
  });

  it("should render with description", () => {
    renderWithTheme(
      <ServiceCard
        icon={mockServiceCard.icon}
        title="Test Service"
        description="Test description text"
      />,
    );

    expect(screen.getByText("Test description text")).toBeInTheDocument();
  });

  it("should have article role with aria-label", () => {
    const { container } = renderWithTheme(
      <ServiceCard
        icon={mockServiceCard.icon}
        title="Test Service"
        description="Test description"
      />,
    );

    const article = container.querySelector('[role="article"]');
    expect(article).toBeInTheDocument();
    expect(article).toHaveAttribute("aria-label", "Test Service");
  });

  it("should be keyboard accessible with tabIndex=0", () => {
    const { container } = renderWithTheme(
      <ServiceCard
        icon={mockServiceCard.icon}
        title="Test Service"
        description="Test description"
      />,
    );

    const card = container.querySelector('[role="article"]');
    expect(card).toHaveAttribute("tabIndex", "0");
  });

  it("should have focus ring style defined", () => {
    const { container } = renderWithTheme(
      <ServiceCard
        icon={mockServiceCard.icon}
        title="Test Service"
        description="Test description"
      />,
    );

    const card = container.querySelector('[role="article"]');
    expect(card).toHaveClass("focus:ring-2");
    expect(card).toHaveClass("focus:outline-none");
  });

  it("should respond to keyboard interaction", async () => {
    const { container } = renderWithTheme(
      <ServiceCard
        icon={mockServiceCard.icon}
        title="Test Service"
        description="Test description"
      />,
    );

    const card = container.querySelector('[role="article"]');
    expect(card).toBeInTheDocument();

    if (card instanceof HTMLElement) {
      card.focus();
      expect(document.activeElement).toBe(card);
    }
  });

  it("should have proper border styling on left", () => {
    const { container } = renderWithTheme(
      <ServiceCard
        icon={mockServiceCard.icon}
        title="Test Service"
        description="Test description"
      />,
    );

    const card = container.querySelector('[role="article"]');
    expect(card).toHaveClass("border-l-4");
  });

  it("should render with index prop", () => {
    renderWithTheme(
      <ServiceCard
        icon={mockServiceCard.icon}
        title="Test Service"
        description="Test description"
        index={2}
      />,
    );

    expect(screen.getByText("Test Service")).toBeInTheDocument();
  });
});
