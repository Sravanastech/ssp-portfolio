import { useAuth } from "@/auth/auth";
import { Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useEffect } from "react";
import { warmBackend } from "@/lib/backendWarmup";
import ErrorPage from "./ErrorPage";

const AuthCallback = () => {
  const { isLoading, isAuthenticated, error } = useAuth();
  const { search } = useLocation();
  // While the URL still carries the OAuth response, the SDK's onRedirectCallback owns the
  // navigation back to the page the visitor started on. Navigating here as well would race
  // it (and used to win, sending every sign-in to /resume).
  const handlingCallback =
    /[?&](code|error)=/.test(search) && /[?&]state=/.test(search);
  useEffect(() => {
    warmBackend(); // a signed-in visitor is likely to open the resume or account next
  }, []);
  if (!isLoading && (error || !isAuthenticated)) {
    return (
      <ErrorPage
        code="403"
        autoRedirect={false}
        message="Sign-in could not be completed. Please try signing in again."
      />
    );
  }
  // Opened directly while already signed in (no OAuth response to process): go home.
  if (!isLoading && isAuthenticated && !handlingCallback)
    return <Navigate to="/" replace />;
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
