import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ThemeProvider } from "./ThemeContext";
import { useTheme } from "./theme-context";

type Listener = (e: { matches: boolean }) => void;
let listeners: Listener[] = [];

function mockMedia(dark: boolean) {
  listeners = [];
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: dark,
    addEventListener: (_: string, l: Listener) => listeners.push(l),
    removeEventListener: (_: string, l: Listener) => {
      listeners = listeners.filter((x) => x !== l);
    },
  })) as unknown as typeof window.matchMedia;
}

function Probe() {
  const { currentTheme, setTheme } = useTheme();
  return <button onClick={() => setTheme("sunrise")}>{currentTheme}</button>;
}

const renderProbe = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });
  afterEach(() => vi.restoreAllMocks());

  it("seeds dark theme from prefers-color-scheme when nothing is stored", () => {
    mockMedia(true);
    renderProbe();
    expect(screen.getByRole("button")).toHaveTextContent("midnight");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("midnight");
  });

  it("uses the light default when the OS prefers light", () => {
    mockMedia(false);
    renderProbe();
    expect(screen.getByRole("button")).toHaveTextContent("sunrise");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("migrates the legacy ocean id", () => {
    mockMedia(false);
    localStorage.setItem("theme", "ocean");
    renderProbe();
    expect(screen.getByRole("button")).toHaveTextContent("midnight");
  });

  it("maps the removed woodland id to sunrise", () => {
    mockMedia(true);
    localStorage.setItem("theme", "woodland");
    renderProbe();
    expect(screen.getByRole("button")).toHaveTextContent("sunrise");
  });

  it("migrates the legacy Aether key once", () => {
    mockMedia(false);
    localStorage.setItem("portfolio-fui-theme", "void");
    renderProbe();
    expect(screen.getByRole("button")).toHaveTextContent("midnight");
    expect(localStorage.getItem("theme")).toBe("midnight");
    expect(localStorage.getItem("portfolio-fui-theme")).toBeNull();
  });

  it("follows OS changes until the visitor chooses", () => {
    mockMedia(false);
    renderProbe();
    act(() => listeners.forEach((l) => l({ matches: true })));
    expect(screen.getByRole("button")).toHaveTextContent("midnight");
    act(() => screen.getByRole("button").click());
    expect(localStorage.getItem("theme")).toBe("sunrise");
    act(() => listeners.forEach((l) => l({ matches: true })));
    expect(screen.getByRole("button")).toHaveTextContent("sunrise");
  });

  it("survives blocked localStorage", () => {
    mockMedia(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderProbe();
    expect(screen.getByRole("button")).toHaveTextContent("midnight");
    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("button")).toHaveTextContent("sunrise");
  });
});
