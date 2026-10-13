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
vi.mock("@auth0/auth0-react", () => ({ useAuth0: () => auth }));

function callback() {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/auth-callback"]}>
          <Routes>
            <Route path="/auth-callback" element={<AuthCallback />} />
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

  it("finishes sign-in even when the identity has no email or account API", async () => {
    callback();
    expect(
      await screen.findByRole("heading", { name: "Secure resume" }),
    ).toBeVisible();
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
