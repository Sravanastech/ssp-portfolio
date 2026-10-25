import {
  readFile,
  readdir,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
} from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import sharp from "sharp";
import { JSDOM } from "jsdom";

const output = resolve("dist");
const builtTemplate = await readFile(resolve(output, "index.html"), "utf8");
// Defer the app bundle until after first paint. Vite emits a module script plus
// modulepreload hints that all compete with the render-blocking CSS and fonts for
// bandwidth; on slow links that pushes FCP/LCP out by ~1s. The prerendered HTML is
// already complete, so a tiny same-origin loader (CSP forbids inline script) fetches
// the bundle once the browser has painted (fallbacks: window load, 4s timer).
const entryMatch = builtTemplate.match(
  /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/,
);
if (!entryMatch) throw new Error("Entry module script not found in index.html");
const preloadTags =
  builtTemplate.match(/<link rel="modulepreload"[^>]*>/g) ?? [];
const preloadHrefs = preloadTags.map((tag) => tag.match(/href="([^"]+)"/)[1]);
// Saved Kinetic choice: fetch its lazy stylesheet now (not after the deferred bundle)
// and flip the paradigm once it has loaded, so returning Kinetic users see a short
// Studio frame at most instead of Studio until the whole app has booted.
const kineticCss = (await readdir(resolve(output, "assets"))).find((file) =>
  /^kinetic-maximalist-[\w-]+\.css$/.test(file),
);
if (!kineticCss) throw new Error("Kinetic stylesheet not found in dist/assets");
const bootSource =
  `(function(){try{if(localStorage.getItem("portfolio-paradigm")==="kinetic"){var k=document.createElement("link");` +
  `k.rel="stylesheet";k.href="/assets/${kineticCss}";k.onload=function(){try{if(localStorage.getItem("portfolio-paradigm")==="kinetic")document.documentElement.dataset.paradigm="kinetic"}catch(e){}};` +
  `document.head.appendChild(k)}}catch(e){}})();` +
  `(function(){var d=0;function r(){if(d)return;d=1;var s=document.createElement("script");` +
  `s.type="module";s.src=${JSON.stringify(entryMatch[1])};document.head.appendChild(s);` +
  `${JSON.stringify(preloadHrefs)}.forEach(function(h){var l=document.createElement("link");` +
  `l.rel="modulepreload";l.href=h;document.head.appendChild(l)})}` +
  `try{new PerformanceObserver(function(l,o){if(l.getEntriesByName("first-contentful-paint").length){o.disconnect();setTimeout(r,0)}})` +
  `.observe({type:"paint",buffered:true})}catch(e){}` +
  `addEventListener("load",function(){setTimeout(r,100)});setTimeout(r,4000)})();`;
const bootName = `boot-${createHash("sha256").update(bootSource).digest("hex").slice(0, 8)}.js`;
await writeFile(resolve(output, "assets", bootName), bootSource);
// Workbox generated sw.js before this file existed: add it to the precache so an
// offline or stale (pre-update) cached index.html can still boot the cached bundle.
const swPath = resolve(output, "sw.js");
const sw = await readFile(swPath, "utf8").catch(() => null);
if (sw !== null) {
  const entryUrl = entryMatch[1].replace(/^\//, "");
  const entryRecord = `{url:"${entryUrl}",revision:null}`;
  if (!sw.includes(entryRecord))
    throw new Error(`Entry ${entryUrl} not found in sw.js precache manifest`);
  await writeFile(
    swPath,
    sw.replace(
      entryRecord,
      `${entryRecord},{url:"assets/${bootName}",revision:null}`,
    ),
  );
}
const template = [entryMatch[0], ...preloadTags]
  .reduce((html, tag) => html.replace(tag, ""), builtTemplate)
  // registerSW.js is a classic script that otherwise blocks first paint.
  .replace(
    /<script id="vite-plugin-pwa:register-sw" src/,
    '<script defer id="vite-plugin-pwa:register-sw" src',
  )
  .replace(
    /(<link rel="stylesheet")/,
    `<script async src="/assets/${bootName}"></script>$1`,
  );
// The social asset is code-native artwork; rasterization makes previews compatible
// with crawlers that do not support SVG Open Graph images.
await sharp(resolve("public/social-preview.svg"))
  .png()
  .toFile(resolve(output, "social-preview.png"));
const serverBundle = await mkdtemp(resolve(tmpdir(), "profile-prerender-"));
try {
  await build({
    configFile: false,
    plugins: [react()],
    resolve: { alias: { "@": resolve("src") } },
    ssr: { noExternal: true },
    build: {
      ssr: resolve("src/entry-prerender.tsx"),
      outDir: serverBundle,
      emptyOutDir: true,
      rollupOptions: { output: { entryFileNames: "prerender.mjs" } },
    },
  });
  const {
    render,
    routes,
    notFoundRoute: NOT_FOUND_ROUTE,
  } = await import(pathToFileURL(resolve(serverBundle, "prerender.mjs")));
  // Search-engine ownership verification, emitted only when configured.
  const escapeAttribute = (value) =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const verification = [
    ["google-site-verification", process.env.VITE_GOOGLE_SITE_VERIFICATION],
    ["msvalidate.01", process.env.VITE_BING_SITE_VERIFICATION],
  ]
    .filter(([, value]) => value?.trim())
    .map(
      ([name, value]) =>
        `<meta name="${name}" content="${escapeAttribute(value.trim())}" />`,
    )
    .join("\n");
  for (const route of [...routes, NOT_FOUND_ROUTE]) {
    const rendered = render(route);
    const { html } = rendered;
    const head = [rendered.head, verification].filter(Boolean).join("\n");
    // Motion's initial state must not hide content from no-JS readers/crawlers.
    const visibleHtml = html.replace(
      /style="([^"]*)"/g,
      (_match, style) =>
        `style="${style.replace(/(^|;)opacity:0(?=;|$)/g, "$1opacity:1").replace(/(^|;)transform:[^;]*/g, "$1transform:none")}"`,
    );
    const document = template
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
      .replace("<!--page-head-->", head)
      .replace('<div id="root"></div>', `<div id="root">${visibleHtml}</div>`);
    if (document === template || !document.includes("<main"))
      throw new Error(`No rendered content for ${route}`);
    const parsedDocument = new JSDOM(document).window.document;
    for (const metadata of parsedDocument.querySelectorAll(
      "#root title, #root meta, #root link",
    )) {
      // Inline SVG <title> elements are accessible names, not document metadata.
      if (metadata.closest("svg")) continue;
      parsedDocument.head.append(metadata);
    }
    const prerenderedDocument = `<!doctype html>\n${parsedDocument.documentElement.outerHTML}`;
    if (route === NOT_FOUND_ROUTE) {
      // Firebase Hosting serves dist/404.html with a real 404 status for unknown paths.
      await writeFile(resolve(output, "404.html"), prerenderedDocument);
    } else {
      const directory = resolve(output, `.${route}`);
      await mkdir(directory, { recursive: true });
      await writeFile(resolve(directory, "index.html"), prerenderedDocument);
    }
    console.log(`Prerendered ${route}`);
  }
} finally {
  await rm(serverBundle, { recursive: true, force: true });
}
