import { useCallback, useEffect, useRef, useState } from "react";
import { studioApi, type Release } from "@/api/studioApi";

const ACTIVE = new Set(["queued", "building"]);

/** Last releases, polled every 4 s while the newest one is queued or building. */
export function useReleases(getToken: () => Promise<string>) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [error, setError] = useState(false);
  const alive = useRef(true);
  const refresh = useCallback(async () => {
    try {
      const list = await studioApi.releases(await getToken());
      if (alive.current) {
        setReleases(list);
        setError(false);
      }
    } catch {
      if (alive.current) setError(true);
    }
  }, [getToken]);
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);
  const active = !!releases[0] && ACTIVE.has(releases[0].status);
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(t);
  }, [active, refresh]);
  return { releases, refresh, error, active };
}
