import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/theme/ThemeContext";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import WorkPage from "../WorkPage";

const queryClient = new QueryClient();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>
          <ThemeProvider>{component}</ThemeProvider>
        </BrowserRouter>
      </HelmetProvider>
    </QueryClientProvider>,
  );
};

describe("WorkPage", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it("should identify the work page with one descriptive heading", () => {
    renderWithProviders(<WorkPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Work that connects.*the whole picture/i,
      }),
    ).toBeInTheDocument();
  });

  it("should render page description", () => {
    renderWithProviders(<WorkPage />);
    expect(
      screen.getByText(/Solutions I build and problems I solve/i),
    ).toBeInTheDocument();
  });

  it("should render case study projects", () => {
    renderWithProviders(<WorkPage />);
    const specHub = screen.getAllByText(
      "Produce specifications and inspections",
    )[0];
    const cityTime = screen.getAllByText("Employee timekeeping and leave")[0];
    const sourceForSports = screen.getAllByText(
      "Retail eCommerce storefront",
    )[0];
    expect(specHub).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Enterprise application modernization",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Business and commerce web applications",
      }),
    ).toBeInTheDocument();
    expect(cityTime).toBeInTheDocument();
    expect(sourceForSports).toBeInTheDocument();
  });

  it("should render case study organizations", () => {
    renderWithProviders(<WorkPage />);
    expect(screen.getByText("Fifth Third Bank")).toBeInTheDocument();
    expect(screen.getByText("Earth7 Consulting LLC")).toBeInTheDocument();
    expect(screen.getByText("Kroger")).toBeInTheDocument();
    expect(screen.getByText("FISA-OPA")).toBeInTheDocument();
    expect(screen.getByText("ICF Next Global")).toBeInTheDocument();
  });

  it("should render CTA section", () => {
    renderWithProviders(<WorkPage />);
    expect(
      screen.getByText("Hiring for an engineering role?"),
    ).toBeInTheDocument();
  });

  it("should have Get in touch link with correct href", () => {
    renderWithProviders(<WorkPage />);
    const link = screen.getByText("Get in touch");
    expect(link).toHaveAttribute("href", "/contact");
  });

  it("should render case study summaries", () => {
    renderWithProviders(<WorkPage />);
    expect(
      screen.getByText(/Web interfaces for produce specifications/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Modernizing employee timekeeping and leave/i),
    ).toBeInTheDocument();
  });
});
