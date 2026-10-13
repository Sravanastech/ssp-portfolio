import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/theme/ThemeContext";
import ErrorPage from "../ErrorPage";

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider>{component}</ThemeProvider>
    </BrowserRouter>,
  );
};

describe("ErrorPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render error message", () => {
    renderWithProviders(<ErrorPage message="Access Denied" code="403" />);
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("should render countdown timer starting at 10", () => {
    renderWithProviders(
      <ErrorPage message="Access Denied" code="403" autoRedirect={true} />,
    );
    expect(screen.getByTestId("countdown-number")).toBeInTheDocument();
    expect(screen.getByTestId("countdown-number")).toHaveTextContent("10");
  });

  it("should decrement countdown every second", () => {
    renderWithProviders(
      <ErrorPage message="Access Denied" code="403" autoRedirect={true} />,
    );
    expect(screen.getByTestId("countdown-number")).toHaveTextContent("10");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("countdown-number")).toHaveTextContent("9");
  });

  it("should render Go Home button", () => {
    renderWithProviders(<ErrorPage message="Access Denied" code="403" />);
    expect(screen.getByText("Go Home")).toBeInTheDocument();
  });

  it("should display error code", () => {
    renderWithProviders(<ErrorPage message="Not Found" code="404" />);
    expect(screen.getByText(/404/)).toBeInTheDocument();
  });

  it("should show SVG error icon", () => {
    const { container } = renderWithProviders(
      <ErrorPage message="Error" code="500" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
