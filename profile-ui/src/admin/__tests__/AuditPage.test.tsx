import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuditPage from "../AuditPage";
import { AdminContext } from "../AdminContext";
import type { Permission } from "../permissions";

const api = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/api/adminApi", async (orig) => ({
  ...(await orig<typeof import("@/api/adminApi")>()),
  adminFetch: api.adminFetch,
}));

const entry = (id: number, outcome = "ok") => ({
  id,
  at: "2026-03-01T10:00:00Z",
  actorId: "11111111-2222-3333-4444-555555555555",
  actorName: "Own Er",
  action: outcome === "ok" ? "draft.create" : "access.denied",
  resource: "7",
  outcome,
  details: '{"permission":"people.read"}',
});

function renderAudit(perms: Permission[] = ["audit.read"]) {
  return render(
    <AdminContext.Provider
      value={{
        token: "tok",
        me: { role: "owner", canPublish: true, permissions: perms },
      }}
    >
      <AuditPage />
    </AdminContext.Provider>,
  );
}

describe("AuditPage", () => {
  beforeEach(() => {
    api.adminFetch.mockReset();
    api.adminFetch.mockResolvedValue({
      items: [entry(3), entry(2, "denied")],
      next: 2,
    });
  });

  it("needs audit.read", async () => {
    renderAudit([]);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /does not include/,
    );
    expect(api.adminFetch).not.toHaveBeenCalled();
  });

  it("shows outcome as text and toggles details", async () => {
    renderAudit();
    expect(await screen.findByText("Denied")).toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Details for event 2" });
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/"permission": "people.read"/)).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByText(/"permission"/)).not.toBeInTheDocument();
  });

  it("loads more with the cursor and filters by action", async () => {
    renderAudit();
    await screen.findByText("Denied");
    api.adminFetch.mockResolvedValue({ items: [entry(1)], next: null });
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() =>
      expect(api.adminFetch).toHaveBeenLastCalledWith(
        "tok",
        "/audit?limit=50&before=2",
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Load more" }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("Action"), {
      target: { value: "team.invite" },
    });
    await waitFor(() =>
      expect(api.adminFetch).toHaveBeenLastCalledWith(
        "tok",
        "/audit?limit=50&action=team.invite",
      ),
    );
  });
});
