/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const robots = readFileSync("public/robots.txt", "utf8");
const llms = readFileSync("public/llms.txt", "utf8");
const deployWorkflow = readFileSync("../.github/workflows/deploy.yml", "utf8");
const siteHealthWorkflow = readFileSync(
  "../.github/workflows/site-health.yml",
  "utf8",
);

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

  it("deploy workflow runs build:release with Auth0, Web3Forms, and GA4 env vars", () => {
    expect(deployWorkflow).toContain("npm run build:release");
    expect(deployWorkflow).not.toContain("VITE_CONTENT_MODE");
    for (const envVar of [
      "VITE_AUTH0_DOMAIN",
      "VITE_AUTH0_CLIENT_ID",
      "VITE_AUTH0_CALLBACK_URL",
      "VITE_AUTH0_AUDIENCE",
      "VITE_WEB3FORMS_ACCESS_KEY",
      "VITE_GA_MEASUREMENT_ID",
    ]) {
      expect(deployWorkflow).toContain(`${envVar}:`);
    }
  });

  it("site-health workflow excludes linkedin.com from lychee link checks", () => {
    expect(siteHealthWorkflow).toContain("--exclude");
    expect(siteHealthWorkflow).toContain("linkedin");
  });
});
