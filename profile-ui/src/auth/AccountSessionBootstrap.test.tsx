import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuth0 } from "@auth0/auth0-react";
import { accountRequest } from "@/api/accountApi";
import AccountSessionBootstrap from "./AccountSessionBootstrap";

vi.mock("@auth0/auth0-react", () => ({ useAuth0: vi.fn() }));
vi.mock("@/api/accountApi", () => ({ accountRequest: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe("account session bootstrap", () => {
  it("posts an idempotent app profile when Auth0 authenticates the session", async () => {
    vi.mocked(useAuth0).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      getAccessTokenSilently: vi.fn().mockResolvedValue("verified-token"),
      user: { given_name: "Test", family_name: "Visitor" },
    } as never);

    render(<AccountSessionBootstrap />);

    await waitFor(() =>
      expect(accountRequest).toHaveBeenCalledWith("verified-token", "POST", {
        firstName: "Test",
        lastName: "Visitor",
      }),
    );
  });

  it("does not call the profile API while signed out", () => {
    vi.mocked(useAuth0).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      getAccessTokenSilently: vi.fn(),
      user: undefined,
    } as never);

    render(<AccountSessionBootstrap />);

    expect(accountRequest).not.toHaveBeenCalled();
  });
});
