import { useAuth0 } from "@auth0/auth0-react";
import ErrorPage from "@/pages/ErrorPage";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, error } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !isAuthenticated) {
    return (
      <ErrorPage
        message="Please log in to access this resource"
        code="403"
        autoRedirect={false}
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
