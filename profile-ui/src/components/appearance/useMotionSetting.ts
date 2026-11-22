import { useCallback, useEffect, useState } from "react";
import {
  REDUCED_MOTION_QUERY,
  osPrefersReducedMotion,
  readStoredMotionReduced,
  setMotionReduced,
} from "@/lib/motionPreference";

/** State behind the "Reduce motion" switch: site override plus the live OS setting. */
export function useMotionSetting() {
  const [stored, setStored] = useState(readStoredMotionReduced);
  const [os, setOs] = useState(osPrefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    let query: MediaQueryList;
    try {
      query = window.matchMedia(REDUCED_MOTION_QUERY);
    } catch {
      return;
    }
    const onChange = (event: MediaQueryListEvent) => setOs(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  const set = useCallback((reduced: boolean) => {
    setMotionReduced(reduced);
    setStored(reduced);
  }, []);

  // The OS preference always wins: the switch reads on and cannot be turned off here.
  return { reduced: os || stored, locked: os, set };
}
