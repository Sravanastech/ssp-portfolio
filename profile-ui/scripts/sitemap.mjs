// Generates dist/sitemap.xml from the canonical URLs of the prerendered pages.
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildSitemap, collectIndexableUrls } from "./seo-assets.mjs";

const dist = resolve("dist");
const urls = await collectIndexableUrls(dist);
if (urls.length === 0) throw new Error("No indexable prerendered pages found");
const lastmod = new Date().toISOString().slice(0, 10);
await writeFile(resolve(dist, "sitemap.xml"), buildSitemap(urls, lastmod));
console.log(`Sitemap: ${urls.length} URLs (lastmod ${lastmod})`);
