import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/auth/auth";
import { accountRequest } from "@/api/accountApi";
import { resetIsAdminCache, useIsAdmin } from "../useIsAdmin";

vi.mock("@/auth/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/api/accountApi", () => ({ accountRequest: vi.fn() }));

function Probe() {
  return <span>{useIsAdmin() ? "admin" : "not-admin"}</span>;
}
const signedIn = () =>
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    getAccessTokenSilently: vi.fn().mockResolvedValue("tok"),
    user: { sub: "auth0|1" },
  } as never);

afterEach(() => {
  vi.clearAllMocks();
  resetIsAdminCache();
});

describe("useIsAdmin", () => {
  it("is true for an admin account and fetches once across mounts", async () => {
    signedIn();
    vi.mocked(accountRequest).mockResolvedValue({ admin: true } as never);
    render(
      <>
        <Probe />
        <Probe />
      </>,
    );
    await waitFor(() => expect(screen.getAllByText("admin")).toHaveLength(2));
    expect(accountRequest).toHaveBeenCalledTimes(1);
  });

  it("is false for a non-admin account", async () => {
    signedIn();
    vi.mocked(accountRequest).mockResolvedValue({ admin: false } as never);
    render(<Probe />);
    await waitFor(() => expect(accountRequest).toHaveBeenCalled());
    expect(screen.getByText("not-admin")).toBeTruthy();
  });

  it("is false and silent when the lookup fails", async () => {
    signedIn();
    vi.mocked(accountRequest).mockRejectedValue(new Error("boom"));
    render(<Probe />);
    await waitFor(() => expect(accountRequest).toHaveBeenCalled());
    expect(screen.getByText("not-admin")).toBeTruthy();
  });

  it("never calls the API for anonymous visitors", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      getAccessTokenSilently: vi.fn(),
      user: undefined,
    } as never);
    render(<Probe />);
    expect(accountRequest).not.toHaveBeenCalled();
    expect(screen.getByText("not-admin")).toBeTruthy();
  });
});
