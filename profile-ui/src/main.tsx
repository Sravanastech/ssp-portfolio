import { SiteContentProvider } from "./content/SiteContent";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./AppRoutes";
import AuthProvider from "./auth/AuthProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "./theme/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { LazyMotion, MotionConfig } from "framer-motion";
import { startMonitoring } from "./lib/monitoring";

// Animation features load async so they stay off the critical path.
const loadMotionFeatures = () =>
  import("./lib/motionFeatures").then((module) => module.default);

startMonitoring();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures}>
        <ThemeProvider>
          <HelmetProvider>
            <Router>
              <QueryClientProvider client={queryClient}>
                <AuthProvider>
                  <ErrorBoundary>
                    <SiteContentProvider>
                      <AppRoutes />
                    </SiteContentProvider>
                  </ErrorBoundary>
                </AuthProvider>
              </QueryClientProvider>
            </Router>
          </HelmetProvider>
        </ThemeProvider>
      </LazyMotion>
    </MotionConfig>
  </StrictMode>,
);
