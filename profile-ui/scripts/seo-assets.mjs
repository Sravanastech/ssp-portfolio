// Pure helpers for post-build SEO assets (sitemap, IndexNow). No side effects on import.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const escapeXml = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Reads the canonical URL of an indexable prerendered page, or null (noindex, none, or not a page). */
export function indexableCanonical(html) {
  if (/<meta[^>]+name="robots"[^>]+noindex/i.test(html)) return null;
  const match = /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i.exec(html);
  return match ? match[1] : null;
}

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "assets") yield* walk(path);
    } else if (entry.name === "index.html") yield path;
  }
}

/** Collects canonical URLs of every indexable dist/**\/index.html. */
export async function collectIndexableUrls(distDirectory) {
  const urls = new Set();
  for await (const file of walk(distDirectory)) {
    const url = indexableCanonical(await readFile(file, "utf8"));
    if (url) urls.add(url);
  }
  return [...urls].sort((a, b) => a.length - b.length || a.localeCompare(b));
}

export function buildSitemap(urls, lastmod) {
  const entries = urls
    .map(
      (url) =>
        `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export const sitemapUrls = (xml) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

export const isValidIndexNowKey = (key) =>
  /^[A-Za-z0-9-]{8,128}$/.test(key ?? "");

export function indexNowPayload(key, urls, host) {
  return {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: urls,
  };
}
