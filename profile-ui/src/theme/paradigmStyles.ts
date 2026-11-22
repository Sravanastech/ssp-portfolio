// Lazy paradigm stylesheet loaders. Kept out of ParadigmContext.tsx so that
// module exports only components and hooks (react-refresh/only-export-components).

// Paradigm stylesheets are code-split: loaded once, only when a visitor asks for them.
// Written as import.meta.glob (a dynamic import under the hood) so a missing file
// resolves to an empty map instead of failing the build or the test transform.
const KINETIC_CSS_KEY = "/src/styles/kinetic-maximalist.css";
const AETHER_CSS_KEY = "/src/styles/aether-cinematic.css";
const kineticStyleLoaders = import.meta.glob(
  "/src/styles/kinetic-maximalist.css",
);
const aetherStyleLoaders = import.meta.glob("/src/styles/aether-cinematic.css");

function createStylePrefetcher(
  loaders: Record<string, () => Promise<unknown>>,
  key: string,
): () => Promise<void> {
  let cached: Promise<void> | null = null;
  return () => {
    if (typeof window === "undefined") return Promise.resolve();
    if (!cached) {
      cached = (async () => {
        try {
          await loaders[key]?.();
        } catch {
          // Failed chunk must never break Studio; the target paradigm just stays unstyled.
        }
      })();
    }
    return cached;
  };
}

export const prefetchKineticStyles = createStylePrefetcher(
  kineticStyleLoaders,
  KINETIC_CSS_KEY,
);

export const prefetchAetherStyles = createStylePrefetcher(
  aetherStyleLoaders,
  AETHER_CSS_KEY,
);
