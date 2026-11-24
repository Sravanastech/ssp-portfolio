import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InviteAcceptPage, {
  stashInviteToken,
  takeInviteToken,
} from "../InviteAcceptPage";

const TOKEN = "a".repeat(43);

const auth = vi.hoisted(() => ({
  isLoading: false,
  isAuthenticated: true,
  error: undefined as Error | undefined,
  user: { sub: "auth0|ed" },
  loginWithRedirect: vi.fn(),
  getAccessTokenSilently: vi.fn(async () => "tok"),
}));
vi.mock("@/auth/auth", () => ({ useAuth: () => auth }));

const api = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/api/adminApi", async (orig) => ({
  ...(await orig<typeof import("@/api/adminApi")>()),
  adminFetch: api.adminFetch,
}));

function page() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <InviteAcceptPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("invite token", () => {
  beforeEach(() => sessionStorage.clear());
  it("moves the fragment token into session storage once", () => {
    expect(stashInviteToken(`#token=${TOKEN}`)).toBe(true);
    expect(takeInviteToken()).toBe(TOKEN);
    expect(takeInviteToken()).toBeNull();
  });
  it("rejects malformed fragments", () => {
    expect(stashInviteToken("#token=<script>")).toBe(false);
    expect(stashInviteToken("#token=short")).toBe(false);
  });
});

describe("InviteAcceptPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    auth.isAuthenticated = true;
    auth.loginWithRedirect.mockClear();
    api.adminFetch.mockReset();
    window.history.pushState({}, "", "/admin/invite");
  });

  it("posts the fragment token once and confirms", async () => {
    window.history.pushState({}, "", `/admin/invite#token=${TOKEN}`);
    api.adminFetch.mockResolvedValue({ role: "editor" });
    page();
    expect(await screen.findByText(/You're an editor/)).toBeInTheDocument();
    expect(api.adminFetch).toHaveBeenCalledTimes(1);
    expect(api.adminFetch).toHaveBeenCalledWith("tok", "/invites/accept", {
      method: "POST",
      body: { token: TOKEN },
    });
    expect(window.location.hash).toBe("");
    expect(
      screen.getByRole("link", { name: /Open the admin/ }),
    ).toHaveAttribute("href", "/admin");
  });

  it("accepts once under StrictMode double mount", async () => {
    window.history.pushState({}, "", `/admin/invite#token=${TOKEN}`);
    api.adminFetch.mockResolvedValue({ role: "editor" });
    render(
      <StrictMode>
        <HelmetProvider>
          <MemoryRouter>
            <InviteAcceptPage />
          </MemoryRouter>
        </HelmetProvider>
      </StrictMode>,
    );
    expect(await screen.findByText(/You're an editor/)).toBeInTheDocument();
    expect(api.adminFetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("asks for MFA sign-in when signed out and keeps the token stashed", async () => {
    auth.isAuthenticated = false;
    window.history.pushState({}, "", `/admin/invite#token=${TOKEN}`);
    page();
    await waitFor(() =>
      expect(auth.loginWithRedirect).toHaveBeenCalledWith(
        expect.objectContaining({ appState: { returnTo: "/admin/invite" } }),
      ),
    );
    expect(sessionStorage.getItem("admin.invite")).toBe(TOKEN);
    expect(api.adminFetch).not.toHaveBeenCalled();
  });

  it("explains when there is no token", async () => {
    page();
    expect(
      await screen.findByText(/Open the invite link again/),
    ).toBeInTheDocument();
    expect(api.adminFetch).not.toHaveBeenCalled();
  });

  it("shows the server's message for an unavailable invite", async () => {
    window.history.pushState({}, "", `/admin/invite#token=${TOKEN}`);
    const { AdminApiError } = await import("@/api/adminApi");
    api.adminFetch.mockRejectedValue(
      new AdminApiError(
        "This invite is expired, already used, or revoked.",
        410,
        "invite_unavailable",
      ),
    );
    page();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /expired, already used/,
    );
  });
});
