import { describe, expect, it } from "vitest";
import { currentReturnPath, safeReturnPath } from "../returnTo";

describe("safeReturnPath", () => {
  it.each([
    "/admin",
    "/admin/",
    "/admin/inquiries",
    "/account",
    "/work/",
    "/work/retail-ecommerce-storefront",
    "/about?x=1#team",
    "/",
  ])("keeps the site page %s", (target) => {
    expect(safeReturnPath(target)).toBe(target);
  });

  it.each([
    undefined,
    "",
    "https://evil.example/admin",
    "//evil.example/admin",
    "/work/not-a-project",
    "/unknown",
  ])("falls back to home for %s", (target) => {
    expect(safeReturnPath(target)).toBe("/");
  });
});

describe("admin sub-pages", () => {
  it("allows admin sub-pages and the invite page", () => {
    for (const p of [
      "/admin/team",
      "/admin/audit",
      "/admin/content",
      "/admin/inbox",
      "/admin/people",
      "/admin/settings/team",
      "/admin/settings/audit",
      "/admin/invite",
    ])
      expect(safeReturnPath(p)).toBe(p);
  });
});

describe("currentReturnPath", () => {
  it("returns the visitor's current page with query and hash", () => {
    expect(
      currentReturnPath({ pathname: "/admin", search: "?tab=1", hash: "#v" }),
    ).toBe("/admin?tab=1#v");
  });

  it("never returns to the callback route", () => {
    expect(
      currentReturnPath({ pathname: "/auth-callback", search: "", hash: "" }),
    ).toBe("/");
  });
});
