import { describe, it, expect } from "vitest";
import { lazy, useEffect } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/theme/ThemeContext";
import LayoutRoute from "../LayoutRoute";

const navRef: { current: ReturnType<typeof useNavigate> | null } = {
  current: null,
};
const Grab = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navRef.current = navigate;
  }, [navigate]);
  return null;
};
const nav = (to: string) => navRef.current!(to);
const Lazy = lazy(
  () =>
    new Promise<{ default: () => React.ReactElement }>((resolve) =>
      setTimeout(() => resolve({ default: () => <p>lazy done</p> }), 400),
    ),
);

const setup = (initial = "/a") =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <HelmetProvider>
        <ThemeProvider>
          <QueryClientProvider client={new QueryClient()}>
            <Grab />
            <Routes>
              <Route element={<LayoutRoute />}>
                <Route path="/a" element={<h1>Page A</h1>} />
                <Route path="/b" element={<h1>Page B</h1>} />
                <Route path="/lazy" element={<Lazy />} />
              </Route>
              <Route path="/outside" element={<p>outside</p>} />
            </Routes>
          </QueryClientProvider>
        </ThemeProvider>
      </HelmetProvider>
    </MemoryRouter>,
  );

describe("LayoutRoute", () => {
  it("keeps header and footer DOM nodes across navigation", async () => {
    const { container } = setup();
    const header = container.querySelector("header");
    const footer = container.querySelector("footer");
    const main = container.querySelector("main");
    expect(header && footer && main).toBeTruthy();
    act(() => void nav("/b"));
    expect(await screen.findByText("Page B")).toBeInTheDocument();
    expect(container.querySelector("header")).toBe(header);
    expect(container.querySelector("footer")).toBe(footer);
    expect(container.querySelector("main")).toBe(main);
  });

  it("renders the skeleton inside the shell (main) while a lazy route loads", async () => {
    const { container } = setup("/lazy");
    const header = container.querySelector("header");
    const skeleton = container.querySelector("main .page-skeleton");
    expect(skeleton).not.toBeNull();
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(header).not.toBeNull();
    expect(await screen.findByText("lazy done")).toBeInTheDocument();
    expect(container.querySelector("header")).toBe(header);
  });

  it("moves focus to #main-content after navigation, not on first render", async () => {
    const { container } = setup();
    const main = container.querySelector("main") as HTMLElement;
    expect(document.activeElement).not.toBe(main);
    act(() => void nav("/b"));
    await screen.findByText("Page B");
    await waitFor(() => expect(document.activeElement).toBe(main));
  });
});
