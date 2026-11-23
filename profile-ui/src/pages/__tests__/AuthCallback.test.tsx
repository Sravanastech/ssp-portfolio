import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthCallback from "../AuthCallback";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const auth = vi.hoisted(() => ({
  isLoading: false,
  isAuthenticated: true,
  error: undefined as Error | undefined,
  user: { sub: "auth0|recruiter" },
  getAccessTokenSilently: vi.fn(),
}));
vi.mock("@/auth/auth", () => ({ useAuth: () => auth }));

function callback(url = "/auth-callback") {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/auth-callback" element={<AuthCallback />} />
            <Route path="/" element={<h1>Home</h1>} />
            <Route path="/resume" element={<h1>Secure resume</h1>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe("sign-in callback", () => {
  beforeEach(() => {
    auth.isLoading = false;
    auth.isAuthenticated = true;
    auth.error = undefined;
  });

  it("opened directly while signed in, goes home (never to /resume)", async () => {
    callback();
    expect(await screen.findByRole("heading", { name: "Home" })).toBeVisible();
  });

  it("leaves navigation to the SDK's return-to handler while the OAuth response is in the URL", () => {
    callback("/auth-callback?code=abc&state=xyz");
    expect(screen.getByRole("status")).toHaveTextContent("Signing in");
    expect(screen.queryByRole("heading", { name: "Secure resume" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Home" })).toBeNull();
  });

  it("waits for Auth0 to finish processing", () => {
    auth.isLoading = true;
    callback();
    expect(screen.getByRole("status")).toHaveTextContent("Signing in");
    expect(screen.queryByRole("heading", { name: "Secure resume" })).toBeNull();
  });

  it("shows a recoverable error instead of an endless loading message", async () => {
    auth.error = new Error("Authentication failed");
    auth.isAuthenticated = false;
    callback();
    await waitFor(() =>
      expect(
        screen.getByText(
          "You don't have permission to access this resource. Please log in.",
        ),
      ).toBeVisible(),
    );
  });
});
