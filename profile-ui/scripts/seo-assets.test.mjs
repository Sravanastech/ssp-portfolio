// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildSitemap,
  indexNowPayload,
  indexableCanonical,
  isValidIndexNowKey,
  sitemapUrls,
} from "./seo-assets.mjs";

describe("seo assets", () => {
  it("reads canonical URLs and skips noindex pages", () => {
    expect(
      indexableCanonical('<link rel="canonical" href="https://x.com/work/" />'),
    ).toBe("https://x.com/work/");
    expect(
      indexableCanonical(
        '<meta name="robots" content="noindex" /><link rel="canonical" href="https://x.com/" />',
      ),
    ).toBeNull();
    expect(indexableCanonical("<html></html>")).toBeNull();
  });
  it("builds a sitemap that round-trips and escapes", () => {
    const xml = buildSitemap(
      ["https://x.com/", "https://x.com/a&b/"],
      "2026-01-02",
    );
    expect(xml).toContain("<lastmod>2026-01-02</lastmod>");
    expect(xml).not.toContain("changefreq");
    expect(sitemapUrls(xml)).toEqual([
      "https://x.com/",
      "https://x.com/a&amp;b/",
    ]);
  });
  it("validates IndexNow keys and payload", () => {
    expect(isValidIndexNowKey("abcdef12")).toBe(true);
    expect(isValidIndexNowKey("short")).toBe(false);
    expect(isValidIndexNowKey("bad key!!")).toBe(false);
    expect(indexNowPayload("abcdef12", ["https://x.com/"], "x.com")).toEqual({
      host: "x.com",
      key: "abcdef12",
      keyLocation: "https://x.com/abcdef12.txt",
      urlList: ["https://x.com/"],
    });
  });
});
