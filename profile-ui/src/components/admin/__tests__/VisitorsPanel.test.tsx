import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import VisitorsPanel from "../VisitorsPanel";

const auth = vi.hoisted(() => ({
  getAccessTokenSilently: vi.fn(async () => "admin-jwt"),
}));
vi.mock("@/auth/auth", () => ({ useAuth: () => auth }));

const visitor = (n: number) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  email: `v${n}@example.com`,
  firstVerifiedAt: "2026-11-01T10:00:00Z",
  lastVerifiedAt: "2026-11-05T10:00:00Z",
  verifyCount: n,
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const calls = () => vi.mocked(fetch).mock.calls;

describe("VisitorsPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    auth.getAccessTokenSilently.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lists visitors with an authorized request", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      json({ items: [visitor(1), visitor(2)], page: 0, size: 25, total: 2 }),
    );
    render(<VisitorsPanel />);
    expect(screen.getByRole("status")).toHaveTextContent(/Loading/);
    const table = await screen.findByRole("table", { name: /visitors/i });
    expect(within(table).getByText("v1@example.com")).toBeInTheDocument();
    expect(within(table).getByText("v2@example.com")).toBeInTheDocument();
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Email", "First viewed", "Last viewed", "Views", "Actions"]);
    expect(calls()[0][0]).toBe("/api/admin/resume-visitors?page=0&size=25");
    expect(calls()[0][1]).toMatchObject({
      headers: { Authorization: "Bearer admin-jwt" },
    });
  });

  it("shows an empty state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      json({ items: [], page: 0, size: 25, total: 0 }),
    );
    render(<VisitorsPanel />);
    expect(
      await screen.findByText(/No verified visitors yet/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an error with retry", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({}, 500))
      .mockResolvedValueOnce(
        json({ items: [visitor(1)], page: 0, size: 25, total: 1 }),
      );
    render(<VisitorsPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Could not load/,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("v1@example.com")).toBeInTheDocument();
  });

  it("explains a forbidden response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({}, 403));
    render(<VisitorsPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only the site owner",
    );
  });

  it("pages through results", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        json({ items: [visitor(1)], page: 0, size: 25, total: 30 }),
      )
      .mockResolvedValueOnce(
        json({ items: [visitor(2)], page: 1, size: 25, total: 30 }),
      );
    render(<VisitorsPanel />);
    await screen.findByText("v1@example.com");
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByText("v2@example.com")).toBeInTheDocument();
    expect(calls()[1][0]).toBe("/api/admin/resume-visitors?page=1&size=25");
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("deletes only after confirmation, then refreshes", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        json({ items: [visitor(1), visitor(2)], page: 0, size: 25, total: 2 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        json({ items: [visitor(2)], page: 0, size: 25, total: 1 }),
      );
    render(<VisitorsPanel />);
    await screen.findByText("v1@example.com");
    fireEvent.click(
      screen.getByRole("button", { name: "Delete v1@example.com" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("v1@example.com");
    expect(dialog).toHaveTextContent(/cannot be undone/i);
    expect(calls()).toHaveLength(1);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete visitor" }),
    );
    await waitFor(() => expect(calls()).toHaveLength(3));
    expect(calls()[1][0]).toBe(
      "/api/admin/resume-visitors/00000000-0000-4000-8000-000000000001",
    );
    expect(calls()[1][1]).toMatchObject({ method: "DELETE" });
    await waitFor(() =>
      expect(screen.queryByText("v1@example.com")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("status")).toHaveTextContent(/removed/i);
  });

  it("cancel leaves the visitor untouched", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      json({ items: [visitor(1)], page: 0, size: 25, total: 1 }),
    );
    render(<VisitorsPanel />);
    await screen.findByText("v1@example.com");
    fireEvent.click(
      screen.getByRole("button", { name: "Delete v1@example.com" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(calls()).toHaveLength(1);
  });

  it("reports a failed delete inside the dialog and keeps it open", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        json({ items: [visitor(1)], page: 0, size: 25, total: 1 }),
      )
      .mockResolvedValueOnce(json({}, 500));
    render(<VisitorsPanel />);
    await screen.findByText("v1@example.com");
    fireEvent.click(
      screen.getByRole("button", { name: "Delete v1@example.com" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete visitor" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      /Could not delete/,
    );
  });

  it("does not fetch while disabled", () => {
    render(<VisitorsPanel enabled={false} />);
    expect(fetch).not.toHaveBeenCalled();
    expect(auth.getAccessTokenSilently).not.toHaveBeenCalled();
  });
});
