import { Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import KineticTickerBar from "@/components/KineticTickerBar";
import AppearancePanel from "@/components/appearance/AppearancePanel";
import PageMetadata from "@/components/PageMetadata";
import OfflineBanner from "@/components/OfflineBanner";
import ConsentBanner from "@/components/ConsentBanner";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import {
  CompositionContext,
  type Composition,
} from "@/theme/CompositionContext";

import { ParadigmProvider, useParadigm } from "@/theme/ParadigmContext";
import { LazyAetherStage, LazyKineticStage } from "@/lib/stageChunks";

// Kinetic-only and Aether-only code: Studio visitors never download these chunks.

function KineticStageSlot() {
  const { isKinetic } = useParadigm();
  if (!isKinetic) return null;
  return (
    <Suspense fallback={null}>
      <LazyKineticStage />
    </Suspense>
  );
}

function AetherStageSlot() {
  const { isAether } = useParadigm();
  if (!isAether) return null;
  return (
    <Suspense fallback={null}>
      <LazyAetherStage />
    </Suspense>
  );
}

type Props = { children: React.ReactNode; showHero?: boolean };
export default function Layout({ children }: Props) {
  const [composition, setComposition] = useState<Composition>("a");
  const { pathname, hash } = useLocation();
  useEffect(() => {
    try {
      const saved = localStorage.getItem("portfolio-composition");
      if (saved === "a" || saved === "b" || saved === "c")
        setComposition(saved);
    } catch {
      /* The switch remains usable without storage. */
    }
  }, []);
  useEffect(() => {
    // No-op unless VITE_GA_MEASUREMENT_ID is set.
    initAnalytics();
  }, []);
  useEffect(() => {
    trackPageView();
  }, [pathname]);
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, hash]);
  const select = (value: Composition) => {
    // Native radio state must update in the input event, including rapid changes.
    // View-transition callbacks defer updates and can undo the browser's checked state.
    setComposition(value);
    try {
      localStorage.setItem("portfolio-composition", value);
    } catch {
      /* Keep the in-memory selection. */
    }
  };
  return (
    <ParadigmProvider>
      <CompositionContext.Provider value={{ composition, select }}>
        <div
          className="studio-shell flex flex-col min-h-screen"
          data-composition={composition}
        >
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <KineticTickerBar />
          <KineticStageSlot />
          <AetherStageSlot />
          <Header />
          <AppearancePanel />
          <PageMetadata />
          <main id="main-content" tabIndex={-1} className="flex-1 w-full">
            {children}
          </main>
          <Footer />
          <OfflineBanner />
          <ConsentBanner />
        </div>
      </CompositionContext.Provider>
    </ParadigmProvider>
  );
}
