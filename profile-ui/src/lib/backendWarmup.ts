let warmed = false;

/**
 * Cloud Run scales to zero, so the first API call pays a cold start. Pinging the public
 * health endpoint as soon as a visitor shows resume intent hides most of it. Fire and
 * forget, no credentials, and at most once per page session.
 */
export function warmBackend(): void {
  if (warmed || typeof fetch !== "function") return;
  warmed = true;
  try {
    void fetch("/api/health", {
      cache: "no-store",
      credentials: "omit",
    }).catch(() => undefined);
  } catch {
    /* warm-up is an optimization only */
  }
}

export function __resetWarmupForTests() {
  warmed = false;
}
