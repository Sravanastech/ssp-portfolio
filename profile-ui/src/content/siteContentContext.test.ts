import { describe, expect, it } from "vitest";
import { staticContent, withRelease } from "./siteContentContext";

describe("withRelease", () => {
  it("returns the bundled content when there is no release", () => {
    expect(withRelease(staticContent, undefined)).toBe(staticContent);
  });

  it("lets the release replace the keys it carries and keeps the rest", () => {
    const merged = withRelease(staticContent, {
      profile: { ...staticContent.profile, name: "Released Name" },
      navigation: [],
    });
    expect(merged.profile.name).toBe("Released Name");
    expect(merged.navigation).toEqual([]);
    expect(merged.experiences).toBe(staticContent.experiences);
    expect(merged.copy).toBe(staticContent.copy);
  });
});

describe("staticContent", () => {
  it("is the bundled content when no release.json is present", () => {
    expect(staticContent.profile.name).toBe("Sravana S Parimi");
    expect(staticContent.experiences.length).toBeGreaterThan(0);
  });
});
