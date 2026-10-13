import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { useAuth0, Auth0ContextInterface } from "@auth0/auth0-react";
import { ThemeProvider } from "@/theme/ThemeContext";
import ProtectedRoute from "../ProtectedRoute";
import type { User } from "@auth0/auth0-react";

// Mock useAuth0
vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn(),
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

  it("should show ErrorPage when not authenticated", () => {
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: undefined,
    } as Auth0ContextInterface<User>);

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText(/Please log in/)).toBeInTheDocument();
  });

  it("should show 403 error code for auth failure", () => {
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: undefined,
    } as Auth0ContextInterface<User>);

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText("403")).toBeInTheDocument();
  });

  it("should render Go Home button on error", () => {
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: undefined,
    } as Auth0ContextInterface<User>);

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText("Go Home")).toBeInTheDocument();
  });

  it("should show protected content when authenticated", () => {
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: undefined,
    } as Auth0ContextInterface<User>);

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
