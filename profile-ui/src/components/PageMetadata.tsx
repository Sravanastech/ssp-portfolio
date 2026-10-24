import { useSiteContent } from "@/content/siteContentContext";
import {
  buildJsonLd,
  canonicalUrl,
  normalizeRoute,
  resolveMetadata,
} from "@/data/siteSettings";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

/** Route rendered into dist/404.html. Never indexable. */
export const NOT_FOUND_ROUTE = "/404";

export default function PageMetadata() {
  const content = useSiteContent();
  const { profile } = content;
  const { pathname } = useLocation();
  const route = normalizeRoute(pathname);
  const metadata = resolveMetadata(route, content);
  if (!metadata)
    return (
      <Helmet>
        {route === NOT_FOUND_ROUTE && (
          <title>{`Page Not Found | ${profile.name}`}</title>
        )}
        <meta name="robots" content="noindex, noarchive" />
      </Helmet>
    );
  const url = canonicalUrl(route, profile.url);
  const image = `${profile.url}/social-preview.png`;
  const jsonLd = buildJsonLd(route, metadata, {
    profile,
    caseStudies: content.caseStudies,
  });
  return (
    <Helmet>
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={metadata.title} />
      <meta property="og:description" content={metadata.description} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={profile.name} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta
        property="og:image:alt"
        content={`${profile.name} — ${profile.role}`}
      />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metadata.title} />
      <meta name="twitter:description" content={metadata.description} />
      <meta name="twitter:image" content={image} />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
