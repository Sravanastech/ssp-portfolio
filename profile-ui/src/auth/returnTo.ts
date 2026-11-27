import { PROJECT_SLUGS } from "@/routes";

/** Pages a visitor may be sent back to after signing in (open-redirect guard). */
const ALLOWED_RETURN_PATHS = new Set([
  "/",
  "/resume",
  "/work",
  "/about",
  "/contact",
  "/privacy",
  "/termsconditions",
  "/account",
  "/admin",
  "/admin/content",
  "/admin/content/raw",
  "/admin/inbox",
  "/admin/people",
  "/admin/settings/team",
  "/admin/settings/audit",
  "/admin/inquiries",
  "/admin/team",
  "/admin/audit",
  "/admin/invite",
  ...PROJECT_SLUGS.map((slug) => `/work/${slug}`),
]);

/** Studio section deep links: /admin/content/<page>/<section>. */
const STUDIO_SECTION = /^\/admin\/content\/[a-z0-9-]+\/[a-z0-9-]+$/;

/**
 * Returns `target` when it points at a known page of this site, otherwise "/".
 * Trailing slashes (prerendered URLs like /work/) are accepted; query and hash are kept.
 */
export function safeReturnPath(target: string | undefined | null): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return "/";
  const path = target.split(/[?#]/)[0];
  const normalized = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return ALLOWED_RETURN_PATHS.has(normalized) || STUDIO_SECTION.test(normalized)
    ? target
    : "/";
}

/** The page the visitor is on now, as a sign-in return target. */
export function currentReturnPath(location: {
  pathname: string;
  search: string;
  hash: string;
}): string {
  if (location.pathname.startsWith("/auth-callback")) return "/";
  return location.pathname + location.search + location.hash;
}
