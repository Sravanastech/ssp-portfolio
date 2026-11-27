// Defined application routes whitelist
export const DEFINED_ROUTES = {
  HOME: "/",
  AUTH_CALLBACK: "/auth-callback",
  RESUME: "/resume",
  ABOUT: "/about",
  WORK: "/work",
  WORK_PROJECT: "/work/:slug",
  CONTACT: "/contact",
  PRIVACY: "/privacy",
  TERMS: "/termsconditions",
  ACCOUNT: "/account",
  ADMIN: "/admin",
  ADMIN_CONTENT: "/admin/content",
  ADMIN_CONTENT_SECTION: "/admin/content/:page/:section",
  ADMIN_CONTENT_RAW: "/admin/content/raw",
  ADMIN_INBOX: "/admin/inbox",
  ADMIN_PEOPLE: "/admin/people",
  ADMIN_TEAM: "/admin/settings/team",
  ADMIN_AUDIT: "/admin/settings/audit",
  /** Legacy paths, kept as redirects. */
  INQUIRIES: "/admin/inquiries",
  LEGACY_TEAM: "/admin/team",
  LEGACY_AUDIT: "/admin/audit",
  ADMIN_INVITE: "/admin/invite",
} as const;

/** Slugs of the per-project pages under /work/, in display order. */
export const PROJECT_SLUGS = [
  "enterprise-application-modernization",
  "produce-specifications-inspections",
  "employee-timekeeping-leave",
  "retail-ecommerce-storefront",
  "business-commerce-web-applications",
] as const;
