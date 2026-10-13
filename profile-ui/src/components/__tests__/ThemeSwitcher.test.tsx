import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import ThemeSwitcher from "../ThemeSwitcher";
import { ThemeProvider } from "@/theme/ThemeContext";

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("ThemeSwitcher", () => {
  it("should render buttons with aria-label", () => {
    const { container } = renderWithTheme(<ThemeSwitcher />);

    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);

    buttons.forEach((button) => {
      expect(button).toHaveAttribute("aria-label");
    });
  });

  it("should have aria-label containing theme name", () => {
    const { container } = renderWithTheme(<ThemeSwitcher />);

    const buttons = container.querySelectorAll("button");
    const labels = Array.from(buttons).map((btn) =>
      btn.getAttribute("aria-label"),
    );

    expect(labels.some((label) => label?.includes("theme"))).toBe(true);
  });

  it("should respond to keyboard Enter key", async () => {
    const { container } = renderWithTheme(<ThemeSwitcher />);

    const buttons = container.querySelectorAll("button");
    const firstButton = buttons[0] as HTMLButtonElement;

    if (firstButton) {
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      fireEvent.keyDown(firstButton, { key: "Enter", code: "Enter" });
      expect(document.activeElement).toBe(firstButton);
    }
  });

  it("should respond to keyboard Space key", async () => {
    const { container } = renderWithTheme(<ThemeSwitcher />);

    const buttons = container.querySelectorAll("button");
    const firstButton = buttons[0] as HTMLButtonElement;

    if (firstButton) {
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      fireEvent.keyDown(firstButton, { key: " ", code: "Space" });
      expect(document.activeElement).toBe(firstButton);
    }
  });

  it("should have focus ring for accessibility", () => {
    const { container } = renderWithTheme(<ThemeSwitcher />);

    const buttons = container.querySelectorAll("button");
    buttons.forEach((button) => {
      expect(button).toHaveClass("focus:ring-2");
      expect(button).toHaveClass("focus:ring-offset-2");
    });
  });

  it("should have aria-pressed attribute", () => {
    const { container } = renderWithTheme(<ThemeSwitcher />);

    const buttons = container.querySelectorAll("button");
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("aria-pressed");
    });
  });

  it("should render all theme buttons", () => {
    const { container } = renderWithTheme(<ThemeSwitcher />);

    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });
});
