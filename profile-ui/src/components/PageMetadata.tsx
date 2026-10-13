import { useSiteContent } from "@/content/SiteContent";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

export { publicMetadata } from "@/data/siteSettings";

export default function PageMetadata() {
  const { profile, seo } = useSiteContent();
  const { pathname } = useLocation();
  const route = pathname.replace(/\/$/, "") || "/";
  const metadata = seo[route];
  if (!metadata)
    return (
      <Helmet>
        <meta name="robots" content="noindex, noarchive" />
      </Helmet>
    );
  const url = `${profile.url}${route === "/" ? "/" : route}`;
  const image = `${profile.url}/social-preview.png`;
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
    </Helmet>
  );
}
