import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageMetadata from "@/components/PageMetadata";
import OfflineBanner from "@/components/OfflineBanner";
import {
  CompositionContext,
  type Composition,
} from "@/theme/CompositionContext";

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
    <CompositionContext.Provider value={{ composition, select }}>
      <div
        className="studio-shell flex flex-col min-h-screen"
        data-composition={composition}
      >
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Header />
        <PageMetadata />
        <main id="main-content" tabIndex={-1} className="flex-1 w-full">
          {children}
        </main>
        <Footer />
        <OfflineBanner />
      </div>
    </CompositionContext.Provider>
  );
}
