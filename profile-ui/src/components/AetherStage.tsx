import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useParadigm } from "@/theme/ParadigmContext";
import { useTheme } from "@/theme/theme-context";
import { isDarkTheme } from "@/theme/themeConfig";
import { useSiteContent } from "@/content/siteContentContext";
import { useRouteHeadingDecipher } from "@/lib/motion";
import HudFrame from "@/components/hud/HudFrame";
import FuiCommandPalette from "@/components/hud/FuiCommandPalette";
import FuiDossierModal from "@/components/hud/FuiDossierModal";

export type FuiTheme = "void" | "cleanroom";

export const FUI_OPEN_COMMAND_EVENT = "fui:open-command";

/**
 * Persistent FUI Minimalism chrome mounted only when paradigm === "aether":
 * - View of the shared light/dark theme (dark -> `void`, light -> `cleanroom`)
 * - Fixed perimeter HUD frame (corner brackets, crosshairs, clock, scroll %)
 * - Global `⌘K` / `Ctrl+K` System Command Palette + Dossier Modal
 */
export default function AetherStage(): React.ReactElement | null {
  const { isAether } = useParadigm();
  const { pathname } = useLocation();
  const { profile, caseStudies } = useSiteContent();
  const { currentTheme, setTheme } = useTheme();
  const dark = isDarkTheme(currentTheme);
  const fuiTheme: FuiTheme = dark ? "void" : "cleanroom";
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useRouteHeadingDecipher(isAether, pathname);

  useEffect(() => {
    if (!isAether || typeof document === "undefined") {
      if (typeof document !== "undefined") {
        delete document.documentElement.dataset.fuiTheme;
      }
      return;
    }
    document.documentElement.dataset.fuiTheme = fuiTheme;
    return () => {
      delete document.documentElement.dataset.fuiTheme;
    };
  }, [isAether, fuiTheme]);

  const toggleFuiTheme = useCallback(
    () => setTheme(dark ? "sunrise" : "midnight"),
    [dark, setTheme],
  );

  useEffect(() => {
    if (!isAether || typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    const onOpenEvent = () => setPaletteOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(FUI_OPEN_COMMAND_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(FUI_OPEN_COMMAND_EVENT, onOpenEvent);
    };
  }, [isAether]);

  if (!isAether) return null;

  const selectedIndex = activeSlug
    ? caseStudies.findIndex((s) => s.slug === activeSlug)
    : -1;
  const selectedStudy = selectedIndex >= 0 ? caseStudies[selectedIndex] : null;

  return (
    <>
      <HudFrame
        fuiTheme={fuiTheme}
        onToggleFuiTheme={toggleFuiTheme}
        onOpenCommand={() => setPaletteOpen(true)}
        locationLabel={profile.location}
      />
      <FuiCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        fuiTheme={fuiTheme}
        onToggleFuiTheme={toggleFuiTheme}
        onSelectStudy={(slug) => setActiveSlug(slug)}
      />
      <FuiDossierModal
        study={selectedStudy}
        index={selectedIndex >= 0 ? selectedIndex : 0}
        onClose={() => setActiveSlug(null)}
      />
    </>
  );
}
