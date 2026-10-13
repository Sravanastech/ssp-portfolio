import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@/theme/ThemeContext";
import BackToTop from "../BackToTop";

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("BackToTop", () => {
  beforeEach(() => {
    // Reset scroll position before each test
    window.scrollY = 0;
    Object.defineProperty(window, "scrollY", {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should be hidden when scrolled near top", () => {
    const { queryByRole } = renderWithTheme(<BackToTop />);
    expect(
      queryByRole("button", { name: /scroll to top/i }),
    ).not.toBeInTheDocument();
  });

  it("should appear when scrolled down", async () => {
    renderWithTheme(<BackToTop />);

    // Simulate scrolling down
    Object.defineProperty(window, "scrollY", {
      writable: true,
      configurable: true,
      value: 500,
    });

    fireEvent.scroll(window, { y: 500 });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /scroll to top/i }),
      ).toBeInTheDocument();
    });
  });

  it("should call scrollTo when clicked", async () => {
    const scrollToMock = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => {});

    renderWithTheme(<BackToTop />);

    // Simulate scrolling down to make button visible
    Object.defineProperty(window, "scrollY", {
      writable: true,
      configurable: true,
      value: 500,
    });
    fireEvent.scroll(window, { y: 500 });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /scroll to top/i }),
      ).toBeInTheDocument();
    });

    const button = screen.getByRole("button", { name: /scroll to top/i });
    fireEvent.click(button);

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });

    scrollToMock.mockRestore();
  });
});
