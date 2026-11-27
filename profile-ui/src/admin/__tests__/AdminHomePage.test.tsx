import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminHomePage from "../AdminHomePage";
import { AdminContext, type SummaryState } from "../AdminContext";

function renderHome(summary?: SummaryState, refreshSummary = vi.fn()) {
  render(
    <MemoryRouter>
      <AdminContext.Provider
        value={{
          getToken: async () => "tok",
          me: { role: "owner", canPublish: true, permissions: [] },
          summary,
          refreshSummary,
        }}
      >
        <AdminHomePage />
      </AdminContext.Provider>
    </MemoryRouter>,
  );
  return refreshSummary;
}

describe("AdminHomePage", () => {
  it("shows a loading state", () => {
    renderHome({ status: "loading" });
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
  });

  it("shows only the cards whose fields are present, linking to the right page", () => {
    renderHome({
      status: "ready",
      data: { openInquiries: 2, newResumeVisitors7d: 5 },
    });
    expect(
      screen.getByRole("link", { name: /2\s*Open inquiries/ }),
    ).toHaveAttribute("href", "/admin/inbox");
    expect(
      screen.getByRole("link", { name: /New resume visitors/ }),
    ).toHaveAttribute("href", "/admin/people");
    expect(screen.queryByText(/Draft waiting/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Denied attempts/)).not.toBeInTheDocument();
    expect(screen.queryByText(/All caught up/)).not.toBeInTheDocument();
  });

  it("links draft and denied cards", () => {
    renderHome({
      status: "ready",
      data: { draftPending: true, deniedEvents7d: 1 },
    });
    expect(screen.getByRole("link", { name: /Draft waiting/ })).toHaveAttribute(
      "href",
      "/admin/content",
    );
    expect(
      screen.getByRole("link", { name: /Denied attempts/ }),
    ).toHaveAttribute("href", "/admin/settings/audit");
  });

  it("says all caught up when nothing needs attention", () => {
    renderHome({
      status: "ready",
      data: { openInquiries: 0, draftPending: false },
    });
    expect(screen.getByText(/All caught up/)).toBeInTheDocument();
  });

  it("offers retry on error", () => {
    const refresh = renderHome({ status: "error" });
    expect(screen.getByRole("alert")).toHaveTextContent(/Could not load/);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refresh).toHaveBeenCalled();
  });
});
