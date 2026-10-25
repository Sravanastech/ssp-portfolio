// Renders the private resume HTML to a print PDF with headless Chromium.
// Usage: node scripts/build-resume.mjs [input.html] [output.pdf]
import { chromium } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const input = resolve(process.argv[2] ?? "private/resume/resume.html");
const output = resolve(process.argv[3] ?? "private/Sravana_Parimi.pdf");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(input).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: output,
    format: "Letter",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;padding:0 0.62in;font-family:Helvetica,Arial,sans-serif;font-size:7pt;color:#4a5873;display:flex;justify-content:space-between;">
      <span>Sravana S Parimi · Senior Software Engineer III</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  });
  console.log(`Wrote ${output}`);
} finally {
  await browser.close();
}
