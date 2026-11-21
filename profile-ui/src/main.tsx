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
import {
  prefetchAetherStyles,
  prefetchKineticStyles,
} from "./theme/paradigmStyles";
import { startMonitoring } from "./lib/monitoring";
import { applyPerfTier } from "./lib/perfTier";
import { prefetchRoute } from "./lib/routePrefetch";
import {
  LazyAetherHomeStage,
  LazyAetherStage,
  LazyKineticStage,
} from "./lib/stageChunks";
import { captureBootElapsed } from "./lib/bootContinuation";
import { parseStoredTheme, resolveTheme } from "./theme/themeConfig";
import {
  applyMotionAttribute,
  readStoredMotionReduced,
} from "./lib/motionPreference";

// Low-end tier flag read by the lazy Kinetic stylesheet (no eager CSS depends on it).
applyPerfTier();

// Web-vitals observers are not needed for first render; start them when idle.
if (typeof window.requestIdleCallback === "function")
  window.requestIdleCallback(startMonitoring, { timeout: 3000 });
else window.setTimeout(startMonitoring, 1500);

/**
 * Mirrors ThemeContext's initial theme (same keys, legacy ids, "system" and OS fallback)
 * so the pre-paint Aether attribute never disagrees with React's choice.
 */
function prePaintFuiTheme(): "void" | "cleanroom" {
  const stored = localStorage.getItem("theme");
  let preference = parseStoredTheme(stored);
  if (!stored) {
    const legacy = localStorage.getItem("portfolio-fui-theme");
    if (legacy === "void") preference = "dark";
    else if (legacy === "cleanroom") preference = "light";
  }
  const prefersDark =
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  return resolveTheme(preference ?? "system", prefersDark) === "midnight"
    ? "void"
    : "cleanroom";
}

// Reflect a stored "Reduce motion" choice before first paint (OS setting is handled in CSS).
try {
  applyMotionAttribute(readStoredMotionReduced());
} catch {
  /* Storage can be disabled; motion follows the OS. */
}

// Apply the stored paradigm (default Aether) before first paint of React and warm its
// CSS chunk. Prerendered pages already run an equivalent external head script; this
// covers dev and client navigations. Module code only: the CSP forbids inline scripts.
let warmAetherChunks = false;
let warmKineticChunks = false;
try {
  const savedParadigm = localStorage.getItem("portfolio-paradigm");
  const root = document.documentElement;
  if (savedParadigm === "kinetic") {
    root.dataset.paradigm = "kinetic";
    delete root.dataset.fuiTheme;
    void prefetchKineticStyles();
    warmKineticChunks = true;
  } else if (savedParadigm === "studio") {
    root.dataset.paradigm = "studio";
    delete root.dataset.fuiTheme;
  } else {
    root.dataset.paradigm = "aether";
    root.dataset.fuiTheme = prePaintFuiTheme();
    void prefetchAetherStyles();
    warmAetherChunks = true;
  }
} catch {
  /* Storage can be disabled; Aether stays the default. */
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
    </StrictMode>,
  );

// Aether's lazy stage chunks too: otherwise their Suspense fallbacks would blank the
// prerendered HUD and hero for a tick when the DOM is replaced.
const warmAether = () =>
  warmKineticChunks
    ? LazyKineticStage.preload().catch(() => undefined)
    : warmAetherChunks
      ? Promise.all([
          LazyAetherStage.preload(),
          LazyAetherHomeStage.preload(),
        ]).catch(() => undefined)
      : Promise.resolve();

void Promise.all([prefetchRoute(window.location.pathname), warmAether()]).then(
  () => {
    // Measure the prerendered boot's progress at the last moment before React replaces it.
    captureBootElapsed(document.getElementById("root"));
    mountApp();
  },
  mountApp,
);
