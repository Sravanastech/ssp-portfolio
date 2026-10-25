import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PrefetchLink from "../PrefetchLink";
import * as prefetch from "@/lib/routePrefetch";

const setup = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <PrefetchLink to="/about">go</PrefetchLink>
      <Routes>
        <Route path="/" element={<p>home</p>} />
        <Route path="/about" element={<p>about page</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe("PrefetchLink", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  it("renders a normal link with href", () => {
    setup();
    expect(screen.getByRole("link", { name: "go" })).toHaveAttribute(
      "href",
      "/about",
    );
  });
  it.each(["pointerEnter", "focus", "touchStart"] as const)(
    "prefetches on %s",
    (evt) => {
      const spy = vi.spyOn(prefetch, "prefetchRoute").mockResolvedValue();
      setup();
      fireEvent[evt](screen.getByRole("link"));
      expect(spy).toHaveBeenCalledWith("/about");
    },
  );
  it("navigates on click", async () => {
    vi.spyOn(prefetch, "prefetchRoute").mockResolvedValue();
    setup();
    fireEvent.click(screen.getByRole("link"));
    await waitFor(() =>
      expect(screen.getByText("about page")).toBeInTheDocument(),
    );
  });
  it("calls consumer handlers", () => {
    const onFocus = vi.fn();
    render(
      <MemoryRouter>
        <PrefetchLink to="/about" onFocus={onFocus}>
          x
        </PrefetchLink>
      </MemoryRouter>,
    );
    fireEvent.focus(screen.getByRole("link"));
    expect(onFocus).toHaveBeenCalled();
  });
});
