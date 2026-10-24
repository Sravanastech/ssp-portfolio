import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import sharp from "sharp";
import { JSDOM } from "jsdom";

const output = resolve("dist");
const template = await readFile(resolve(output, "index.html"), "utf8");
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
