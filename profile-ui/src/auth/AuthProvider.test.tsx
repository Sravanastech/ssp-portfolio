import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthProvider from "./AuthProvider";
import { useAuth } from "./auth";

const bridge = vi.hoisted(() => ({
  mounts: 0,
  loginWithRedirect: vi.fn().mockResolvedValue(undefined),
  getAccessTokenSilently: vi.fn().mockResolvedValue("token"),
  logout: vi.fn().mockResolvedValue(undefined),
  authenticated: false,
}));

vi.mock("./Auth0Bridge", async () => {
  const { useEffect } = await import("react");
  return {
    default: function MockBridge({
      onChange,
    }: {
      onChange: (s: unknown, m: unknown) => void;
    }) {
      useEffect(() => {
        bridge.mounts += 1;
        onChange(
          {
            isLoading: false,
            isAuthenticated: bridge.authenticated,
            user: bridge.authenticated ? { email: "a@b.c" } : undefined,
            error: undefined,
          },
          {
            loginWithRedirect: bridge.loginWithRedirect,
            logout: bridge.logout,
            getAccessTokenSilently: bridge.getAccessTokenSilently,
          },
        );
      }, [onChange]);
      return null;
    },
  };
});

const probe = { current: undefined as unknown as ReturnType<typeof useAuth> };
function Probe() {
  const latest = useAuth();
  useEffect(() => {
    probe.current = latest;
  });
  return (
    <p data-testid="state">
      {latest.isLoading ? "loading" : latest.isAuthenticated ? "in" : "out"}
    </p>
  );
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </MemoryRouter>,
  );

describe("lazy auth facade", () => {
  beforeEach(() => {
    bridge.mounts = 0;
    bridge.authenticated = false;
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => localStorage.clear());

  it("does not load the SDK bridge on public routes", () => {
    renderAt("/");
    expect(bridge.mounts).toBe(0);
    expect(screen.getByTestId("state")).toHaveTextContent(/^out$/);
  });

  it("loads the bridge on protected routes and reports its state", async () => {
    bridge.authenticated = true;
    renderAt("/resume");
    expect(screen.getByTestId("state")).toHaveTextContent("loading");
    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent(/^in$/),
    );
    expect(localStorage.getItem("auth.hint")).toBe("1");
  });

  it("loads the bridge when a session hint exists", async () => {
    localStorage.setItem("auth.hint", "1");
    renderAt("/");
    await waitFor(() => expect(bridge.mounts).toBe(1));
  });

  it("queues loginWithRedirect, activates the bridge, then runs it once", async () => {
    renderAt("/");
    let done!: Promise<void>;
    act(() => {
      done = probe.current.loginWithRedirect({
        appState: { returnTo: "/resume" },
      });
    });
    await done;
    expect(bridge.mounts).toBe(1);
    expect(bridge.loginWithRedirect).toHaveBeenCalledTimes(1);
    expect(bridge.loginWithRedirect).toHaveBeenCalledWith({
      appState: { returnTo: "/resume" },
    });
  });

  it("clears the hint on logout", async () => {
    localStorage.setItem("auth.hint", "1");
    bridge.authenticated = true;
    renderAt("/");
    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent(/^in$/),
    );
    await act(() => probe.current.logout());
    expect(localStorage.getItem("auth.hint")).toBeNull();
    expect(bridge.logout).toHaveBeenCalled();
  });
});
