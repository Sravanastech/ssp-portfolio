import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const robots = readFileSync("public/robots.txt", "utf8");
const llms = readFileSync("public/llms.txt", "utf8");

describe("crawler-facing public files", () => {
  it("names the AI crawlers explicitly and keeps private routes disallowed", () => {
    for (const bot of [
      "GPTBot",
      "ClaudeBot",
      "PerplexityBot",
      "Google-Extended",
      "Applebot-Extended",
    ]) {
      expect(robots).toContain(`User-agent: ${bot}`);
    }
    for (const route of ["/account", "/admin", "/resume", "/auth-callback"]) {
      expect(robots).toContain(`Disallow: ${route}`);
    }
    expect(robots).toContain("Sitemap: https://sravanasparimi.com/sitemap.xml");
  });

  it("llms.txt identifies the person and links every project page", () => {
    expect(llms.startsWith("# Sravana S Parimi")).toBe(true);
    for (const slug of [
      "enterprise-application-modernization",
      "produce-specifications-inspections",
      "employee-timekeeping-leave",
      "retail-ecommerce-storefront",
      "business-commerce-web-applications",
    ]) {
      expect(llms).toContain(`https://sravanasparimi.com/work/${slug}/`);
    }
  });
});
