import { lazy, useState, type ComponentType } from "react";

/**
 * React.lazy that renders synchronously once its chunk was preloaded (main.tsx awaits
 * the preloads before the first render). Plain React.lazy suspends on first read even
 * for an already-fetched module, which would blank the prerendered DOM for a few frames
 * while Suspense shows its (empty) fallback.
 */
function preloadedLazy(
  loader: () => Promise<{ default: ComponentType }>,
): ComponentType & { preload: () => Promise<unknown> } {
  let resolved: ComponentType | undefined;
  const load = () =>
    loader().then((module) => {
      resolved = module.default;
      return module;
    });
  const Lazy = lazy(load);
  function Preloaded() {
    // Pinned per mount: a later preload must not swap Lazy -> Ready (remount).
    const [Ready] = useState(() => resolved);
    return Ready ? <Ready /> : <Lazy />;
  }
  return Object.assign(Preloaded, { preload: load });
}

export const LazyKineticStage = preloadedLazy(
  () => import("@/components/KineticStage"),
);
export const LazyAetherStage = preloadedLazy(
  () => import("@/components/AetherStage"),
);
export const LazyAetherHomeStage = preloadedLazy(
  () => import("@/components/AetherHomeStage"),
);
