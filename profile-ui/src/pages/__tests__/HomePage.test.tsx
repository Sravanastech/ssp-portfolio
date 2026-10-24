import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/theme/ThemeContext";
import HomePage from "../HomePage";
import Layout from "@/layouts/Layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <HelmetProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <Layout>{component}</Layout>
          </QueryClientProvider>
        </ThemeProvider>
      </HelmetProvider>
    </BrowserRouter>,
  );
};

describe("HomePage Integration Tests", () => {
  it("should render the hero section with headline", () => {
    renderWithProviders(<HomePage />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0]).toHaveTextContent(
      "Full stack engineer. Technical lead.",
    );
  });

  it("should render approach section", () => {
    renderWithProviders(<HomePage />);

    expect(
      screen.getByText("From full stack to team delivery."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Interfaces for complex work/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Services that support the experience/i),
    ).toBeInTheDocument();
  });

  it("should render call to action section", () => {
    renderWithProviders(<HomePage />);

    expect(
      screen.getByText("Hiring for a senior engineering role?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tell me about the role/i)).toBeInTheDocument();
  });

  it("should have link to contact page", () => {
    renderWithProviders(<HomePage />);

    const contactLinks = screen.getAllByRole("link", {
      name: /send message|get in touch/i,
    });
    expect(contactLinks.length).toBeGreaterThan(0);
  });

  it("should have link to about page", () => {
    renderWithProviders(<HomePage />);

    const aboutLink = screen.getByRole("link", {
      name: /more about my approach/i,
    });
    expect(aboutLink).toHaveAttribute("href", "/about");
  });
});

describe("HomePage paradigm toggle", () => {
  it("switches to kinetic, mounts ticker, returns to studio, keeps focus", async () => {
    localStorage.clear();
    renderWithProviders(<HomePage />);
    const toggle = screen.getAllByRole("button", {
      name: /switch to kinetic maximalist mode/i,
    })[0];
    toggle.focus();
    fireEvent.click(toggle);
    expect(document.documentElement.dataset.paradigm).toBe("kinetic");
    expect(
      await screen.findByRole("region", { name: /kinetic telemetry ticker/i }),
    ).toBeInTheDocument();
    const back = screen.getAllByRole("button", {
      name: /switch to studio minimalist mode/i,
    })[0];
    expect(back).toHaveFocus();
    fireEvent.click(back);
    expect(document.documentElement.dataset.paradigm).toBe("studio");
    expect(
      screen.queryByRole("region", { name: /kinetic telemetry ticker/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", {
        name: /switch to kinetic maximalist mode/i,
      })[0],
    ).toHaveFocus();
    localStorage.clear();
  });
});
