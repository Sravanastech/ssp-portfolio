import type React from "react";
import { useEffect, useRef } from "react";
import CornerBracket from "./CornerBracket";
import Crosshair from "./Crosshair";
import Scanline from "./Scanline";

export interface HudFrameProps {
  fuiTheme: "void" | "cleanroom";
  onOpenAppearance: () => void;
  onOpenCommand: () => void;
  locationLabel: string;
}

function formatUtcClock(date = new Date()): string {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} UTC`;
}

function formatScrollTelemetry(): string {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return "SCROLL // 000%";
  }
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct =
    scrollable > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((window.scrollY / scrollable) * 100)),
        )
      : 0;
  return `SCROLL // ${String(pct).padStart(3, "0")}%`;
}

/**
 * Fixed, pointer-events-none perimeter FUI HUD frame with corner brackets,
 * mid-axis registration crosshairs, zero-rerender UTC clock and scroll RAF
 * telemetry, and a pointer-events-auto bottom-right command/theme dock.
 */
export default function HudFrame({
  fuiTheme,
  onOpenAppearance,
  onOpenCommand,
  locationLabel,
}: HudFrameProps): React.ReactElement {
  const clockRef = useRef<HTMLSpanElement>(null);
  const scrollRef = useRef<HTMLSpanElement>(null);

  // Live 1s UTC clock updated via DOM ref (zero React re-renders).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateClock = () => {
      if (clockRef.current) {
        clockRef.current.textContent = formatUtcClock();
      }
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  // Passive scroll RAF telemetry updater (zero React re-renders).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;
    const flush = () => {
      frame = 0;
      if (scrollRef.current) {
        scrollRef.current.textContent = formatScrollTelemetry();
      }
    };
    flush();
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(flush);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <aside
      className="fui-hud-frame pointer-events-none fixed inset-0 z-40"
      style={{ pointerEvents: "none" }}
      role="region"
      aria-label="System HUD telemetry"
      data-fui-theme={fuiTheme}
    >
      <CornerBracket
        position="tl"
        className="fui-hud-corner fui-hud-corner--tl pointer-events-none fixed top-3 left-3"
      />
      <CornerBracket
        position="tr"
        className="fui-hud-corner fui-hud-corner--tr pointer-events-none fixed top-3 right-3"
      />
      <CornerBracket
        position="bl"
        className="fui-hud-corner fui-hud-corner--bl pointer-events-none fixed bottom-3 left-3"
      />
      <CornerBracket
        position="br"
        className="fui-hud-corner fui-hud-corner--br pointer-events-none fixed bottom-3 right-3"
      />

      <Crosshair className="fui-hud-crosshair fui-hud-crosshair--left pointer-events-none fixed top-1/2 left-3 -translate-y-1/2" />
      <Crosshair className="fui-hud-crosshair fui-hud-crosshair--right pointer-events-none fixed top-1/2 right-3 -translate-y-1/2" />

      <div className="fui-hud-top-left fixed top-3 left-8 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase">
        <Scanline className="fui-hud-scanline opacity-70" />
        <span className="fui-hud-location">{locationLabel}</span>
      </div>

      <div className="fui-hud-top-right fixed top-3 right-8 flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] uppercase tabular-nums">
        <span className="fui-hud-status">SYS.NOMINAL // 60FPS</span>
        <span
          ref={clockRef}
          className="fui-hud-clock"
          aria-label="Live UTC clock"
        >
          00:00:00 UTC
        </span>
      </div>

      <div className="fui-hud-bottom-left fixed bottom-3 left-8 font-mono text-[11px] tracking-[0.14em] uppercase tabular-nums">
        <span ref={scrollRef} className="fui-hud-scroll">
          SCROLL // 000%
        </span>
      </div>

      <div
        className="fui-hud-dock pointer-events-auto fixed bottom-3 right-8 flex items-center gap-2 font-mono text-[13px] tracking-[0.12em] uppercase"
        style={{ pointerEvents: "auto" }}
      >
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label="Open appearance settings"
          data-state={fuiTheme}
          className="fui-hud-switch inline-flex items-center gap-2 px-2.5 py-1.5"
          onClick={onOpenAppearance}
        >
          <span
            className="fui-hud-switch-option"
            data-active={fuiTheme === "void"}
          >
            VOID
          </span>
          <span className="fui-hud-switch-track" aria-hidden="true">
            <span className="fui-hud-switch-thumb" />
          </span>
          <span
            className="fui-hud-switch-option"
            data-active={fuiTheme === "cleanroom"}
          >
            CLEANROOM
          </span>
        </button>

        <button
          type="button"
          aria-label="Open system command palette"
          className="fui-hud-cmd inline-flex items-center justify-center px-2.5 py-1.5"
          onClick={onOpenCommand}
        >
          <kbd aria-hidden="true">⌘K</kbd>
        </button>
      </div>
    </aside>
  );
}
