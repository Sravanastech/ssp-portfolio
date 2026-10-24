import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/auth/auth";
import { ensureAccount } from "@/api/accountApi";
import AccountSessionBootstrap from "./AccountSessionBootstrap";

vi.mock("@/auth/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/api/accountApi", () => ({
  ensureAccount: vi.fn().mockResolvedValue({}),
}));

afterEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("account session bootstrap", () => {
  it("ensures the app profile once when Auth0 authenticates the session", async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      getAccessTokenSilently: vi.fn().mockResolvedValue("verified-token"),
      user: { given_name: "Test", family_name: "Visitor" },
    } as never);

    render(<AccountSessionBootstrap />);

    await waitFor(() =>
      expect(ensureAccount).toHaveBeenCalledWith("verified-token", {
        firstName: "Test",
        lastName: "Visitor",
      }),
    );
  });

  it("skips provisioning when this session already bootstrapped", () => {
    sessionStorage.setItem("account-bootstrapped", "auth0|1");
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      getAccessTokenSilently: vi.fn().mockResolvedValue("t"),
      user: { sub: "auth0|1" },
    } as never);

    render(<AccountSessionBootstrap />);

    expect(ensureAccount).not.toHaveBeenCalled();
  });

  it("does not call the profile API while signed out", () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      getAccessTokenSilently: vi.fn(),
      user: undefined,
    } as never);

    render(<AccountSessionBootstrap />);

    expect(ensureAccount).not.toHaveBeenCalled();
  });
});
