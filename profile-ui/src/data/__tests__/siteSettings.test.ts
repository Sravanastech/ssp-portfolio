import { describe, expect, it } from "vitest";
import { profile } from "../profile";
import { caseStudies } from "../caseStudies";
import {
  PROJECT_SLUGS,
  buildJsonLd,
  canonicalUrl,
  projectMetadata,
  projectSlug,
  publicMetadata,
  resolveMetadata,
} from "../siteSettings";

const content = { seo: publicMetadata, caseStudies };

describe("site SEO metadata", () => {
  it("uses trailing-slash canonicals except the root", () => {
    expect(canonicalUrl("/")).toBe("https://sravanasparimi.com/");
    expect(canonicalUrl("/work")).toBe("https://sravanasparimi.com/work/");
    expect(canonicalUrl("/work/")).toBe("https://sravanasparimi.com/work/");
  });
  it("keeps indexable page titles and descriptions in range and unique", () => {
    const entries = Object.entries(publicMetadata);
    for (const [route, { title, description }] of entries) {
      expect(title.length, route).toBeLessThanOrEqual(60);
      expect(description.length, route).toBeGreaterThanOrEqual(100);
      expect(description.length, route).toBeLessThanOrEqual(160);
    }
    for (const route of ["/", "/work", "/about", "/contact"]) {
      expect(publicMetadata[route].title.length, route).toBeGreaterThanOrEqual(
        50,
      );
      expect(
        publicMetadata[route].description.length,
        route,
      ).toBeGreaterThanOrEqual(140);
    }
    expect(new Set(entries.map(([, m]) => m.title)).size).toBe(entries.length);
    expect(publicMetadata["/about"].title).toContain(
      "Sravana Subramanyam Parimi (Sravan)",
    );
  });
  it("resolves a slug for every case study and metadata for each project route", () => {
    expect(caseStudies.map(projectSlug)).toEqual([...PROJECT_SLUGS]);
    for (const slug of PROJECT_SLUGS) {
      const meta = resolveMetadata(`/work/${slug}/`, content);
      expect(meta?.title).toMatch(/ \| Sravana S Parimi$/);
      expect(meta!.description.length).toBeLessThanOrEqual(160);
    }
    expect(resolveMetadata("/work/nope", content)).toBeUndefined();
    expect(projectMetadata(caseStudies[0]).title).toBe(
      `${caseStudies[0].name} | ${profile.name}`,
    );
  });
  it("emits one linked graph per page", () => {
    const about = buildJsonLd("/about", publicMetadata["/about"], {
      profile,
      caseStudies,
    });
    const types = about["@graph"].map((n) => n["@type"]);
    expect(types).toEqual([
      "Person",
      "WebSite",
      "ProfilePage",
      "BreadcrumbList",
    ]);
    const work = buildJsonLd("/work", publicMetadata["/work"], {
      profile,
      caseStudies,
    });
    const list = work["@graph"].find((n) => n["@type"] === "ItemList") as {
      itemListElement: { url: string }[];
    };
    expect(list.itemListElement.map((i) => i.url)).toEqual(
      PROJECT_SLUGS.map((s) => `https://sravanasparimi.com/work/${s}/`),
    );
    const home = buildJsonLd("/", publicMetadata["/"], {
      profile,
      caseStudies,
    });
    expect(home["@graph"].some((n) => n["@type"] === "BreadcrumbList")).toBe(
      false,
    );
  });
});
