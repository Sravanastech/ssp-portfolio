import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/auth/auth";
import { adminLoginOptions } from "@/admin/adminLogin";
import ErrorPage from "@/pages/ErrorPage";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Ask Auth0 for multi-factor sign-in (admin surfaces). */
  mfa?: boolean;
}

const ProtectedRoute = ({ children, mfa = false }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, error, loginWithRedirect } = useAuth();
  const location = useLocation();
  const returnTo = location.pathname + location.search;
  const shouldSignIn = !isLoading && !isAuthenticated && !error;

  useEffect(() => {
    if (shouldSignIn) {
      void loginWithRedirect(
        mfa ? adminLoginOptions(returnTo) : { appState: { returnTo } },
      );
    }
  }, [shouldSignIn, loginWithRedirect, returnTo, mfa]);

  if (isLoading || shouldSignIn) {
    return (
      <div
        role="status"
        className="flex items-center justify-center min-h-screen"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto mb-4"></div>
          <p>{isLoading ? "Loading..." : "Redirecting to sign in..."}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorPage
        message="Sign-in is unavailable right now. Please try again later."
        code="403"
        autoRedirect={false}
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
