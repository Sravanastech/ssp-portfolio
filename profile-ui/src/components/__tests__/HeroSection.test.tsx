import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import HeroSection from "../HeroSection";
import { profile } from "@/data/profile";
import { ThemeProvider } from "@/theme/ThemeContext";

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider>{component}</ThemeProvider>
    </BrowserRouter>,
  );
};

describe("HeroSection", () => {
  it("should render with default headline", () => {
    renderWithProviders(<HeroSection />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0]).toHaveTextContent(
      "Full stack engineer. Technical lead.",
    );
  });

  it("should render with custom headline", () => {
    renderWithProviders(<HeroSection title="Custom Title" />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0]).toHaveTextContent("Custom Title");
  });

  it("should render with default subheading", () => {
    renderWithProviders(<HeroSection />);

    const subheadings = screen.getAllByText(profile.description);
    expect(subheadings.length).toBeGreaterThan(0);
  });

  it("should render CTA buttons", () => {
    renderWithProviders(<HeroSection />);

    const exploreButton = screen.getByRole("link", { name: /Explore Work/i });
    const contactButton = screen.getByRole("link", { name: /Get in Touch/i });

    expect(exploreButton).toBeInTheDocument();
    expect(contactButton).toBeInTheDocument();
  });

  it("should have proper heading hierarchy with h1", () => {
    const { container } = renderWithProviders(<HeroSection />);

    const h1Elements = container.querySelectorAll("h1");
    expect(h1Elements.length).toBeGreaterThan(0);
    expect(h1Elements[0]).toHaveTextContent(
      "Full stack engineer. Technical lead.",
    );
  });

  it("should have accessible section aria-label", () => {
    const { container } = renderWithProviders(<HeroSection />);

    const section = container.querySelector("section");
    expect(section).toHaveAttribute("aria-label");
    expect(section?.getAttribute("aria-label")).toContain("Hero");
  });

  it("should render with custom description", () => {
    const customDesc = "Custom description text";
    renderWithProviders(<HeroSection description={customDesc} />);

    const descriptions = screen.getAllByText(customDesc);
    expect(descriptions.length).toBeGreaterThan(0);
  });
});
