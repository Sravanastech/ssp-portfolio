import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { useAuth, type AuthContextValue } from "@/auth/auth";
import { ThemeProvider } from "@/theme/ThemeContext";
import ProtectedRoute from "../ProtectedRoute";

// Mock the auth facade
vi.mock("@/auth/auth", () => ({
  useAuth: vi.fn(),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider>{component}</ThemeProvider>
    </BrowserRouter>,
  );
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects signed-out visitors to Auth0 with a returnTo", () => {
    const loginWithRedirect = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: undefined,
      loginWithRedirect,
    } as unknown as AuthContextValue);
    window.history.pushState({}, "", "/account");

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );
    expect(loginWithRedirect).toHaveBeenCalledWith({
      appState: { returnTo: "/account" },
    });
    expect(screen.getByText(/Redirecting to sign in/)).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("shows a 403 page when authentication errored, without redirect loop", () => {
    const loginWithRedirect = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: new Error("boom"),
      loginWithRedirect,
    } as unknown as AuthContextValue);

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );
    expect(loginWithRedirect).not.toHaveBeenCalled();
    expect(screen.getByText("403")).toBeInTheDocument();
    expect(screen.getByText("Go Home")).toBeInTheDocument();
  });

  it("should show protected content when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: undefined,
    } as AuthContextValue);

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
