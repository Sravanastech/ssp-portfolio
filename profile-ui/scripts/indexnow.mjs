// IndexNow (Bing, Yandex). Usage:
//   node scripts/indexnow.mjs --write-key   build step: writes dist/<INDEXNOW_KEY>.txt
//   node scripts/indexnow.mjs --submit      after deploy: POSTs sitemap URLs to IndexNow
// Both are no-ops when INDEXNOW_KEY is unset.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  indexNowPayload,
  isValidIndexNowKey,
  sitemapUrls,
} from "./seo-assets.mjs";

const key = process.env.INDEXNOW_KEY?.trim();
const mode = process.argv[2];
if (!key) {
  console.log("INDEXNOW_KEY not set; skipping IndexNow.");
} else if (!isValidIndexNowKey(key)) {
  throw new Error("INDEXNOW_KEY must be 8-128 characters of a-z, A-Z, 0-9, -");
} else if (mode === "--write-key") {
  await writeFile(resolve("dist", `${key}.txt`), key);
  console.log(`IndexNow key file written: dist/${key}.txt`);
} else if (mode === "--submit") {
  const urls = sitemapUrls(await readFile(resolve("dist/sitemap.xml"), "utf8"));
  const host = new URL(urls[0]).host;
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(indexNowPayload(key, urls, host)),
  });
  console.log(`IndexNow responded ${response.status} for ${urls.length} URLs`);
  if (response.status >= 400) process.exitCode = 1;
} else {
  throw new Error("Usage: indexnow.mjs --write-key | --submit");
}
