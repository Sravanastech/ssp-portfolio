import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminShell from "../AdminShell";
import { useAdmin } from "../AdminContext";

const auth = vi.hoisted(() => ({
  isLoading: false,
  isAuthenticated: true,
  error: undefined as Error | undefined,
  user: { sub: "auth0|x" },
  loginWithRedirect: vi.fn(),
  getAccessTokenSilently: vi.fn(async () => "tok"),
}));
vi.mock("@/auth/auth", () => ({ useAuth: () => auth }));

const api = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/api/adminApi", async (orig) => ({
  ...(await orig<typeof import("@/api/adminApi")>()),
  adminFetch: api.adminFetch,
}));

/** Routes /me and /summary to separate canned responses. */
function mockApi(me: unknown, summary: unknown) {
  api.adminFetch.mockImplementation(async (_token: string, path: string) => {
    if (path === "/me") return me;
    if (path === "/summary") return summary;
    throw new Error(`unexpected ${path}`);
  });
}

function Probe() {
  const { me } = useAdmin();
  const { pathname } = useLocation();
  return (
    <>
      <p>role:{me.role}</p>
      <p>at:{pathname}</p>
    </>
  );
}

function shell(path = "/admin") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<Probe />} />
          <Route path="*" element={<Probe />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

async function apiError(message: string, status: number, code?: string) {
  const { AdminApiError } = await import("@/api/adminApi");
  return new AdminApiError(message, status, code as never);
}

describe("AdminShell", () => {
  beforeEach(() => {
    api.adminFetch.mockReset();
    auth.loginWithRedirect.mockClear();
  });

  it("shows only permitted navigation for an editor", async () => {
    mockApi(
      {
        role: "editor",
        canPublish: false,
        permissions: ["content.edit", "insights.read"],
      },
      {},
    );
    shell();
    expect(await screen.findByText("role:editor")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Admin" });
    expect(nav).toHaveTextContent("Home");
    expect(nav).toHaveTextContent("Content");
    expect(
      screen.queryByRole("link", { name: /Inbox/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Team" }),
    ).not.toBeInTheDocument();
    expect(api.adminFetch).toHaveBeenCalledWith("tok", "/me");
  });

  it("shows Team and Audit log for an owner", async () => {
    mockApi(
      {
        role: "owner",
        canPublish: true,
        permissions: ["team.manage", "audit.read", "content.edit"],
      },
      {},
    );
    shell();
    expect(
      await screen.findByRole("link", { name: "Team" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Audit log" })).toBeInTheDocument();
  });

  it("shows the open-inquiry badge on Inbox", async () => {
    mockApi(
      {
        role: "owner",
        canPublish: true,
        permissions: ["inquiries.manage", "inquiries.reply"],
      },
      { openInquiries: 3 },
    );
    shell();
    const link = await screen.findByRole("link", { name: /Inbox/ });
    await waitFor(() => expect(link).toHaveTextContent("3"));
  });

  it("opens the command palette with Ctrl+K and navigates on Enter", async () => {
    mockApi(
      {
        role: "owner",
        canPublish: true,
        permissions: ["team.manage", "audit.read", "content.edit"],
      },
      {},
    );
    shell();
    await screen.findByText("role:owner");
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox", {
      name: "Search admin pages",
    });
    fireEvent.change(input, { target: { value: "audit" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(await screen.findByText("at:/admin/settings/audit")).toBeVisible();
  });

  it("closes the palette with Escape", async () => {
    mockApi({ role: "owner", canPublish: true, permissions: [] }, {});
    shell();
    await screen.findByText("role:owner");
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    await screen.findByRole("dialog");
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("offers MFA sign-in when the server says mfa_required", async () => {
    api.adminFetch.mockRejectedValue(
      await apiError(
        "This area needs multi-factor sign-in.",
        403,
        "mfa_required",
      ),
    );
    shell();
    fireEvent.click(
      await screen.findByRole("button", { name: "Sign in again with MFA" }),
    );
    expect(auth.loginWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ appState: { returnTo: "/admin" } }),
    );
  });

  it("links to the account page when not provisioned", async () => {
    api.adminFetch.mockRejectedValue(
      await apiError(
        "Open your account page once, then come back.",
        403,
        "account_not_provisioned",
      ),
    );
    shell();
    expect(
      await screen.findByRole("link", { name: /account page/i }),
    ).toHaveAttribute("href", "/account");
  });

  it("shows a plain message when forbidden", async () => {
    api.adminFetch.mockRejectedValue(
      await apiError("Your role does not include this area.", 403, "forbidden"),
    );
    shell();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /does not include/,
    );
  });
});
