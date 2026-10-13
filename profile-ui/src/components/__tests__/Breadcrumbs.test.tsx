import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/theme/ThemeContext";
import Breadcrumbs from "../Breadcrumbs";

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider>{component}</ThemeProvider>
    </BrowserRouter>,
  );
};

describe("Breadcrumbs", () => {
  it("should render breadcrumb items", () => {
    const items = [
      { label: "Home", path: "/" },
      { label: "Privacy", path: "/privacy" },
    ];
    renderWithProviders(<Breadcrumbs items={items} />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
  });

  it("should render chevron between items", () => {
    const items = [{ label: "Home", path: "/" }, { label: "Privacy" }];
    const { container } = renderWithProviders(<Breadcrumbs items={items} />);
    const chevrons = container.querySelectorAll("svg");
    expect(chevrons.length).toBeGreaterThan(0);
  });

  it("should have nav role with aria-label", () => {
    const items = [{ label: "Home", path: "/" }];
    renderWithProviders(<Breadcrumbs items={items} />);
    expect(
      screen.getByRole("navigation", { name: /breadcrumb/i }),
    ).toBeInTheDocument();
  });
});
