import { profile } from "./profile";

export type PageMetadataEntry = { title: string; description: string };

export const publicMetadata: Record<string, PageMetadataEntry> = {
  "/": {
    title: `${profile.name} — Senior Software Engineer, Full Stack Lead`,
    description: `${profile.name} is a senior software engineer and full stack technical lead in Cincinnati, OH, building React, TypeScript, Java and Spring Boot applications.`,
  },
  "/work": {
    title: `Selected Work: Full Stack Case Studies | ${profile.name}`,
    description:
      "Case studies by Sravana S Parimi: banking application modernization, produce inspections, employee timekeeping and retail eCommerce, with outcomes.",
  },
  "/about": {
    title: `About Sravana Subramanyam Parimi (Sravan) | Engineer`,
    description: `About ${profile.fullName} (${profile.shortName}), ${profile.role} at ${profile.employer}: full stack engineering since ${profile.careerStartYear} and technical leadership.`,
  },
  "/contact": {
    title: `Contact ${profile.name} | Roles and Hiring Inquiries`,
    description: `Hiring for a senior full stack or technical lead role? Send ${profile.name} a message about the position, the team and the work, or email directly.`,
  },
  "/privacy": {
    title: `Privacy Policy | ${profile.name}`,
    description:
      "Read how Sravana S Parimi's portfolio handles contact inquiries, sign-in, and shared information, including retention and the service providers involved.",
  },
  "/termsconditions": {
    title: `Terms and Conditions | ${profile.name}`,
    description:
      "Read the terms of use for Sravana S Parimi's portfolio, including content and work references, third-party links, accuracy and limitation of liability.",
  },
};

export const navigation = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

// ---------------------------------------------------------------------------
// SEO helpers shared by PageMetadata (client + prerender) and the build scripts.
// ---------------------------------------------------------------------------

/** Project detail page slugs, in case study order. Used when a case study has no `slug` field. */
export const PROJECT_SLUGS = [
  "enterprise-application-modernization",
  "produce-specifications-inspections",
  "employee-timekeeping-leave",
  "retail-ecommerce-storefront",
  "business-commerce-web-applications",
] as const;

const SLUG_BY_STUDY_ID: Record<string, string> = {
  "application-modernization": PROJECT_SLUGS[0],
  "quality-inspection": PROJECT_SLUGS[1],
  "workforce-modernization": PROJECT_SLUGS[2],
  "ecommerce-shopify-vue": PROJECT_SLUGS[3],
  "business-web-applications": PROJECT_SLUGS[4],
};

export type StudyLike = {
  id: string;
  name: string;
  summary: string;
  preview?: string;
  slug?: string;
};

export const projectSlug = (study: Pick<StudyLike, "id" | "slug">) =>
  study.slug ?? SLUG_BY_STUDY_ID[study.id];

/** Route key without trailing slash ("/" stays "/"). */
export const normalizeRoute = (pathname: string) =>
  pathname.replace(/\/+$/, "") || "/";

/** Absolute URL in the served form: trailing slash for every non-root route. */
export const canonicalUrl = (route: string, origin = profile.url) => {
  const normalized = normalizeRoute(route);
  return normalized === "/" ? `${origin}/` : `${origin}${normalized}/`;
};

const clamp = (text: string, max: number) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "")}…`;
};

/**
 * Title and description for a project detail page.
 * Title: `${project} | Sravana S Parimi`. Description: the project summary plus its preview, max 160 chars.
 */
export function projectMetadata(
  study: Pick<StudyLike, "name" | "summary" | "preview">,
): PageMetadataEntry {
  const body = [study.summary, study.preview].filter(Boolean).join(" ");
  return {
    title: `${study.name} | ${profile.name}`,
    description: clamp(`${body} By ${profile.name}.`, 160),
  };
}

/** Metadata for any indexable route (static pages and `/work/<slug>`), or undefined when not indexable. */
export function resolveMetadata(
  route: string,
  content: {
    seo: Record<string, PageMetadataEntry>;
    caseStudies: readonly StudyLike[];
  },
): PageMetadataEntry | undefined {
  const normalized = normalizeRoute(route);
  if (content.seo[normalized]) return content.seo[normalized];
  const match = /^\/work\/([^/]+)$/.exec(normalized);
  if (!match) return undefined;
  const study = content.caseStudies.find((s) => projectSlug(s) === match[1]);
  return study ? projectMetadata(study) : undefined;
}

const KNOWS_ABOUT = [
  "React",
  "TypeScript",
  "Java",
  "Spring Boot",
  "Next.js",
  "Vue.js",
  "Storybook",
  "AWS",
  "Shopify",
  "Full-stack web development",
  "Technical leadership",
];

const BREADCRUMB_LABELS: Record<string, string> = {
  "/work": "Work",
  "/about": "About",
  "/contact": "Contact",
  "/privacy": "Privacy Policy",
  "/termsconditions": "Terms and Conditions",
};

type Person = typeof profile;

/** One schema.org @graph for a route. Person and WebSite are shared across pages and linked by @id. */
export function buildJsonLd(
  route: string,
  metadata: PageMetadataEntry,
  content: { profile: Person; caseStudies: readonly StudyLike[] },
) {
  const { profile: p, caseStudies } = content;
  const normalized = normalizeRoute(route);
  const url = canonicalUrl(normalized, p.url);
  const personId = `${p.url}/#person`;
  const websiteId = `${p.url}/#website`;
  const sameAs = [p.linkedin, p.github, p.githubProjects].filter(Boolean);
  const person = {
    "@type": "Person",
    "@id": personId,
    name: p.name,
    alternateName: [
      "Sravan Parimi",
      "Sravana Parimi",
      p.fullName,
      "DevSravana",
    ],
    givenName: "Sravana",
    additionalName: "Subramanyam",
    familyName: "Parimi",
    jobTitle: p.role,
    worksFor: { "@type": "Organization", name: p.employer },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Cincinnati",
      addressRegion: "OH",
      addressCountry: "US",
    },
    url: `${p.url}/`,
    image: `${p.url}/social-preview.png`,
    sameAs,
    knowsAbout: KNOWS_ABOUT,
  };
  const website = {
    "@type": "WebSite",
    "@id": websiteId,
    url: `${p.url}/`,
    name: p.name,
    alternateName: "Sravana Parimi Portfolio",
    inLanguage: "en",
    publisher: { "@id": personId },
  };
  const pageId = `${url}#webpage`;
  const projectPages = caseStudies
    .map((study) => ({ study, slug: projectSlug(study) }))
    .filter((item): item is { study: StudyLike; slug: string } => !!item.slug);
  const page: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": pageId,
    url,
    name: metadata.title,
    description: metadata.description,
    inLanguage: "en",
    isPartOf: { "@id": websiteId },
    about: { "@id": personId },
  };
  if (normalized === "/about") {
    page["@type"] = "ProfilePage";
    page.mainEntity = { "@id": personId };
  } else if (normalized === "/work") {
    page["@type"] = "CollectionPage";
    page.mainEntity = { "@id": `${url}#projects` };
  }
  const graph: Record<string, unknown>[] = [person, website, page];
  if (normalized === "/work") {
    graph.push({
      "@type": "ItemList",
      "@id": `${url}#projects`,
      itemListElement: projectPages.map(({ study, slug }, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: study.name,
        url: canonicalUrl(`/work/${slug}`, p.url),
      })),
    });
  }
  if (normalized !== "/") {
    const trail: { name: string; url: string }[] = [
      { name: "Home", url: `${p.url}/` },
    ];
    const project = /^\/work\/[^/]+$/.test(normalized);
    if (project) {
      trail.push({ name: "Work", url: canonicalUrl("/work", p.url) });
      trail.push({
        name: metadata.title.split(" | ")[0],
        url,
      });
    } else {
      trail.push({
        name: BREADCRUMB_LABELS[normalized] ?? metadata.title,
        url,
      });
    }
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: trail.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    });
    page.breadcrumb = { "@id": `${url}#breadcrumb` };
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
