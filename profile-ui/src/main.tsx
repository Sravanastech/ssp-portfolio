import { SiteContentProvider } from "./content/SiteContent";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./AppRoutes";
import AppReady from "./components/AppReady";
import AuthProvider from "./auth/AuthProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "./theme/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { LazyMotion, MotionConfig } from "framer-motion";
import { prefetchKineticStyles } from "./theme/ParadigmContext";
import { startMonitoring } from "./lib/monitoring";
import { applyPerfTier } from "./lib/perfTier";
import { prefetchRoute } from "./lib/routePrefetch";

// Animation features load async so they stay off the critical path.
const loadMotionFeatures = () =>
  import("./lib/motionFeatures").then((module) => module.default);

// Low-end tier flag read by the lazy Kinetic stylesheet (no eager CSS depends on it).
applyPerfTier();

// Web-vitals observers are not needed for first render; start them when idle.
if (typeof window.requestIdleCallback === "function")
  window.requestIdleCallback(startMonitoring, { timeout: 3000 });
else window.setTimeout(startMonitoring, 1500);

// Apply a saved Kinetic choice before first paint of React and warm its CSS chunk.
// Module code only: the CSP forbids inline scripts.
try {
  if (localStorage.getItem("portfolio-paradigm") === "kinetic") {
    document.documentElement.dataset.paradigm = "kinetic";
    void prefetchKineticStyles();
  }
} catch {
  /* Storage can be disabled; Studio stays the default. */
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Warm the current route's lazy chunk first so the prerendered page is replaced in one
// step (no skeleton flash or footer jump while the chunk loads). The prerendered DOM
// stays visible meanwhile; a failed fetch falls through to the normal Suspense path.
const mountApp = () =>
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
                        <AppReady />
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

void prefetchRoute(window.location.pathname).then(mountApp, mountApp);
