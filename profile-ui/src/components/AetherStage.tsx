import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useParadigm } from "@/theme/ParadigmContext";
import { useSiteContent } from "@/content/siteContentContext";
import {
  enable as enableAetherAudio,
  playHoverTick,
  playSwitchChime,
} from "@/lib/aetherAudio";
import AetherCanvas from "./AetherCanvas";

const FINE_POINTER = "(pointer: fine)";
const GLASS_CARD_SELECTOR =
  ".studio-project, .studio-case, .system-studio, .page-panel, .studio-contact form, .project-related a";
const HOVER_AUDIO_THROTTLE_MS = 90;

function matches(query: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia?.(query)?.matches ?? false;
  } catch {
    return false;
  }
}

function formatScrollDepth(): string {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return "00%";
  }
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct =
    scrollable > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((window.scrollY / scrollable) * 100)),
        )
      : 0;
  return `${String(pct).padStart(2, "0")}%`;
}

/** Aether spatial canvas, telemetry HUD, pointer glare, and opt-in soundscape. */
export default function AetherStage(): React.ReactElement | null {
  const { isAether } = useParadigm();
  const { profile } = useSiteContent();
  const [soundOn, setSoundOn] = useState(false);
  const scrollPctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isAether) setSoundOn(false);
  }, [isAether]);

  // Passive RAF scroll depth updater (zero React re-renders).
  useEffect(() => {
    if (!isAether) return;
    let frame = 0;
    const flush = () => {
      frame = 0;
      const el = scrollPctRef.current;
      if (el) el.textContent = formatScrollDepth();
    };
    flush();
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(flush);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isAether]);

  // Passive RAF pointer specular glare controller (fine pointers & non-lite perf).
  useEffect(() => {
    if (!isAether) return;
    if (
      !matches(FINE_POINTER) ||
      document.documentElement.dataset.perf === "lite"
    ) {
      return;
    }

    let frame = 0;
    let lastX = 0;
    let lastY = 0;
    let lastTarget: EventTarget | null = null;

    const flush = () => {
      frame = 0;
      if (
        !(lastTarget instanceof Element) ||
        typeof lastTarget.closest !== "function"
      ) {
        return;
      }
      const card = lastTarget.closest<HTMLElement>(GLASS_CARD_SELECTOR);
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--glow-x", `${lastX - rect.left}px`);
      card.style.setProperty("--glow-y", `${lastY - rect.top}px`);
    };

    const onMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      lastTarget = e.target;
      if (!frame) frame = window.requestAnimationFrame(flush);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isAether]);

  // Opt-in procedural hover micro-ticks (throttled to <= 1 per 90ms).
  useEffect(() => {
    if (!isAether || !soundOn) return;
    let lastTick = 0;

    const onEnter = (e: Event) => {
      if (!(e.target instanceof Element)) return;
      if (!e.target.matches("a, button")) return;
      const now = performance.now();
      if (now - lastTick < HOVER_AUDIO_THROTTLE_MS) return;
      lastTick = now;
      playHoverTick();
    };

    document.addEventListener("pointerenter", onEnter, {
      capture: true,
      passive: true,
    });
    return () => {
      document.removeEventListener("pointerenter", onEnter, { capture: true });
    };
  }, [isAether, soundOn]);

  if (!isAether) return null;

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) {
      enableAetherAudio();
      playSwitchChime();
    }
  };

  return (
    <>
      <div className="aether-scroll-beam" aria-hidden="true" />
      <AetherCanvas />
      <aside
        className="aether-hud"
        role="region"
        aria-label="Aether observatory telemetry"
      >
        <span className="aether-hud-location">{profile.location}</span>
        <span className="aether-hud-metric">
          Depth{" "}
          <strong>
            <span ref={scrollPctRef}>00%</span>
          </strong>
        </span>
        <button
          type="button"
          className="aether-hud-btn"
          aria-pressed={soundOn}
          aria-label={
            soundOn ? "Mute Aether soundscape" : "Enable Aether soundscape"
          }
          onClick={handleToggleSound}
        >
          {soundOn ? "Sound On" : "Sound Off"}
        </button>
      </aside>
    </>
  );
}
