/** Route chunk prefetching. Loaders share specifiers with AppRoutes' React.lazy imports, so Vite reuses the same chunks. */
import type { ComponentType } from "react";
import { warmBackend } from "@/lib/backendWarmup";

type Loader = () => Promise<unknown>;

export const routeLoaders = {
  "/about": () => import("@/pages/AboutPage"),
  "/work": () => import("@/pages/WorkPage"),
  "/work/:slug": () => import("@/pages/ProjectPage"),
  "/contact": () => import("@/pages/ContactPage"),
  "/privacy": () => import("@/pages/PrivacyPage"),
  "/termsconditions": () => import("@/pages/TermsAndConditions"),
  "/resume": () => import("@/pages/ResumePage"),
} satisfies Record<string, Loader>;

export type RouteKey = keyof typeof routeLoaders;

/** Routes a visitor most likely opens next from the home page. */
const LIKELY_NEXT: RouteKey[] = ["/work", "/about", "/contact"];

const cache = new Map<RouteKey, Promise<void>>();
const resolved = new Map<RouteKey, ComponentType<object>>();

/** Component of a route chunk that already finished loading, if any. */
export function getResolvedRoute(
  key: RouteKey,
): ComponentType<object> | undefined {
  return resolved.get(key);
}

export function resolveRouteKey(path: string): RouteKey | null {
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (clean in routeLoaders) return clean as RouteKey;
  if (/^\/work\/[^/]+$/.test(clean)) return "/work/:slug";
  return null;
}

export function prefetchRoute(path: string): Promise<void> {
  const key = resolveRouteKey(path);
  if (!key) return Promise.resolve();
  // Resume intent (hover, focus, touch, click) also warms the scale-to-zero API.
  if (key === "/resume") warmBackend();
  const hit = cache.get(key);
  if (hit) return hit;
  const pending = Promise.resolve()
    .then(() => routeLoaders[key]())
    .then(
      (module) => {
        resolved.set(
          key,
          (module as { default: ComponentType<object> }).default,
        );
      },
      () => {
        cache.delete(key); // allow retry on the next intent signal
      },
    );
  cache.set(key, pending);
  return pending;
}

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

export function shouldSkipPrefetch(): boolean {
  if (typeof navigator === "undefined") return true;
  const c = (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
  if (!c) return false;
  return !!c.saveData || /(^|-)2g$/.test(c.effectiveType ?? "");
}

/** Prefetch likely next routes when the browser is idle. Returns a cancel function. */
export function scheduleIdlePrefetch(
  paths: string[] = LIKELY_NEXT,
): () => void {
  if (typeof window === "undefined" || shouldSkipPrefetch()) return () => {};
  const run = () => {
    if (!shouldSkipPrefetch()) paths.forEach((p) => void prefetchRoute(p));
  };
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 1500);
  return () => window.clearTimeout(id);
}

export function __resetPrefetchForTests() {
  cache.clear();
  resolved.clear();
}
