import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/theme/ThemeContext";
import { motion } from "framer-motion";
import { AlertCircle, Home } from "lucide-react";

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
  const { colors } = useTheme();
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
    <div
      className="flex flex-col items-center justify-center min-h-screen px-4 py-12"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      <motion.div
        className="text-center max-w-md space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Error Icon */}
        <div className="flex justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ color: colors.error }}
          >
            <AlertCircle size={64} />
          </motion.div>
        </div>

        {/* Error Code */}
        <div
          className="text-6xl font-bold tracking-tight"
          style={{
            color: colors.primary,
            fontFamily: '"IBM Plex Mono", monospace',
          }}
        >
          {code}
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold" style={{ color: colors.primary }}>
            {getErrorTitle()}
          </h1>
          <p style={{ color: colors.textSecondary }}>{getErrorDescription()}</p>
        </div>

        {/* Countdown Timer */}
        {autoRedirect && (
          <motion.div
            className="py-6 rounded-lg border"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p style={{ color: colors.textSecondary }} className="text-sm mb-2">
              Redirecting in{" "}
              <span data-testid="countdown-number">{countdown}</span>s...
            </p>
            <div
              className="relative w-32 h-1 mx-auto rounded-full overflow-hidden"
              style={{ backgroundColor: colors.border }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: colors.primary }}
                animate={{ width: `${(countdown / COUNTDOWN_SECONDS) * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}

        {/* Go Home Button */}
        <button
          onClick={() => navigate(redirectPath)}
          className="px-8 py-3 rounded-lg font-bold transition-all hover:scale-105 focus:ring-2 focus:ring-offset-2 focus:outline-none flex items-center justify-center gap-2 mx-auto"
          style={{
            backgroundColor: colors.primary,
            color: colors.accent,
          }}
        >
          <Home size={20} />
          Go Home
        </button>
      </motion.div>
    </div>
  );
};

export default ErrorPage;
