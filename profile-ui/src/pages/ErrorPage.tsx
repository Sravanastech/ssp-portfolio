import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { m } from "framer-motion";
import { AlertCircle, Home } from "lucide-react";
import "@/styles/pages.css";

interface ErrorPageProps {
  message: string;
  code: "404" | "403" | "500";
  redirectPath?: string;
  autoRedirect?: boolean;
}

const COUNTDOWN_SECONDS = 10;

const ErrorPage = ({
  message,
  code,
  redirectPath = "/",
  autoRedirect = true,
}: ErrorPageProps) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!autoRedirect) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(redirectPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRedirect, redirectPath, navigate]);

  const getErrorTitle = () => {
    switch (code) {
      case "403":
        return "Access Denied";
      case "404":
        return "Page Not Found";
      case "500":
        return "Server Error";
      default:
        return "Error";
    }
  };

  const getErrorDescription = () => {
    switch (code) {
      case "403":
        return "You don't have permission to access this resource. Please log in.";
      case "404":
        return "The page you're looking for doesn't exist.";
      case "500":
        return "Something went wrong on our end. Please try again later.";
      default:
        return message;
    }
  };

  return (
    <div className="studio-page error-page">
      <div className="studio-container">
        <m.header
          className="studio-page-intro"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="error-code">
            <AlertCircle size={24} aria-hidden="true" />
            {code}
          </p>
          <h1 className="studio-page-heading">{getErrorTitle()}</h1>
          <p className="studio-lede">{getErrorDescription()}</p>
          {autoRedirect && (
            <div className="error-countdown">
              <p>
                Redirecting in{" "}
                <span data-testid="countdown-number">{countdown}</span>s...
              </p>
              <div className="error-track" aria-hidden="true">
                <m.span
                  animate={{
                    width: `${(countdown / COUNTDOWN_SECONDS) * 100}%`,
                  }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>
            </div>
          )}
          <div className="studio-actions">
            <button
              type="button"
              onClick={() => navigate(redirectPath)}
              className="studio-button"
            >
              <Home size={18} aria-hidden="true" />
              Go Home
            </button>
          </div>
        </m.header>
      </div>
    </div>
  );
};

export default ErrorPage;
