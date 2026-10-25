import { lazy, useState, type ComponentType } from "react";
import { getResolvedRoute, routeLoaders, type RouteKey } from "./routePrefetch";

/**
 * React.lazy wrapper that renders synchronously once the route chunk was prefetched
 * (main.tsx awaits it before the first render). Plain React.lazy always suspends on
 * first read, which swaps the prerendered page for a skeleton and shifts the layout.
 */
export function routeComponent(key: RouteKey): ComponentType {
  const Lazy = lazy(
    routeLoaders[key] as () => Promise<{ default: ComponentType }>,
  );
  return function RouteComponent() {
    // Pinned per mount: a later prefetch must not swap Lazy -> Ready (remount, state loss).
    const [Ready] = useState(() => getResolvedRoute(key));
    return Ready ? <Ready /> : <Lazy />;
  };
}
