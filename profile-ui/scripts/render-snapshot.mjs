import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const [inputPath, outputDir] = process.argv.slice(2);
if (!inputPath || !outputDir) throw new Error("Usage: render-snapshot.mjs snapshot.json output-directory");
const bundle = resolve(process.env.PROFILE_RENDERER_BUNDLE ?? "dist/renderer/prerender.mjs");
const templatePath = resolve(process.env.PROFILE_STATIC_INDEX ?? "dist/index.html");
const { routes, render } = await import(pathToFileURL(bundle));
const snapshot = JSON.parse(await readFile(inputPath, "utf8"));
const template = await readFile(templatePath, "utf8");
if (!Number.isSafeInteger(snapshot.revision) || !snapshot.content?.profile) throw new Error("Invalid content snapshot");

for (const route of routes) {
  const { html, head } = render(route, snapshot.content);
  const document = template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace("<!--page-head-->", head)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  if (document === template || !document.includes("<main")) throw new Error(`Incomplete rendered route ${route}`);
  const directory = route === "/" ? outputDir : resolve(outputDir, `.${route}`);
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, "index.html"), `<!doctype html>\n${document}`);
}
console.log(`Rendered ${routes.length} routes for revision ${snapshot.revision}`);
