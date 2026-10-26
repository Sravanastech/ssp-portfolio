import { useAuth } from "@/auth/auth";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useEffect } from "react";
import { warmBackend } from "@/lib/backendWarmup";
import ErrorPage from "./ErrorPage";

const AuthCallback = () => {
  const { isLoading, isAuthenticated, error } = useAuth();
  useEffect(() => {
    warmBackend(); // the visitor is about to land on /resume
  }, []);
  // The provider honors appState.returnTo. This route is a fallback for a
  // completed callback without appState; it needs no separate account database.
  if (!isLoading && (error || !isAuthenticated)) {
    return (
      <ErrorPage
        code="403"
        autoRedirect={false}
        message="Sign-in could not be completed. Please try signing in again."
      />
    );
  }
  if (!isLoading && isAuthenticated) return <Navigate to="/resume" replace />;
  return (
    <>
      <Helmet>
        <title>Signing in | Sravana S Parimi</title>
        <meta name="robots" content="noindex, noarchive" />
      </Helmet>
      <p role="status" className="p-8">
        Signing in…
      </p>
    </>
  );
};

export default AuthCallback;
