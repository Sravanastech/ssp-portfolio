import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

function Probe() {
  const { me } = useAdmin();
  return <p>role:{me.role}</p>;
}

function shell(path = "/admin") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<Probe />} />
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
    api.adminFetch.mockResolvedValue({
      role: "editor",
      canPublish: false,
      permissions: ["content.edit", "insights.read"],
    });
    shell();
    expect(await screen.findByText("role:editor")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Admin" })).toHaveTextContent(
      "Overview",
    );
    expect(
      screen.queryByRole("link", { name: "Team" }),
    ).not.toBeInTheDocument();
    expect(api.adminFetch).toHaveBeenCalledWith("tok", "/me");
  });

  it("shows Team and Audit log for an owner", async () => {
    api.adminFetch.mockResolvedValue({
      role: "owner",
      canPublish: true,
      permissions: ["team.manage", "audit.read", "content.edit"],
    });
    shell();
    expect(
      await screen.findByRole("link", { name: "Team" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Audit log" })).toBeInTheDocument();
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
