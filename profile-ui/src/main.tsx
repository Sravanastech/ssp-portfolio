import { SiteContentProvider } from "./content/SiteContent";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./AppRoutes";
import Auth0ProviderWithNavigate from "./auth/Auth0ProviderWithNavigate";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "./theme/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { MotionConfig } from "framer-motion";
import { startMonitoring } from "./lib/monitoring";

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
      <ThemeProvider>
        <HelmetProvider>
          <Router>
            <QueryClientProvider client={queryClient}>
              <Auth0ProviderWithNavigate>
                <ErrorBoundary>
                  <SiteContentProvider><AppRoutes /></SiteContentProvider>
                </ErrorBoundary>
              </Auth0ProviderWithNavigate>
            </QueryClientProvider>
          </Router>
        </HelmetProvider>
      </ThemeProvider>
    </MotionConfig>
  </StrictMode>,
);
