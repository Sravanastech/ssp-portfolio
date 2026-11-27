import { describe, expect, it } from "vitest";
import { visibleItems, visibleNav } from "../permissions";

describe("visibleNav", () => {
  it("editor with content.edit sees Home and Content only", () => {
    expect(
      visibleItems(["content.edit", "insights.read"]).map((n) => n.label),
    ).toEqual(["Home", "Content"]);
  });
  it("owner sees every page, grouped", () => {
    const groups = visibleNav([
      "content.edit",
      "inquiries.manage",
      "people.read",
      "team.manage",
      "audit.read",
    ]);
    expect(groups.map((g) => g.group)).toEqual([
      "Home",
      "Site",
      "Audience",
      "Settings",
    ]);
    expect(groups.flatMap((g) => g.items.map((i) => i.label))).toEqual([
      "Home",
      "Content",
      "Inbox",
      "People",
      "Team",
      "Audit log",
    ]);
  });
  it("drops groups with no permitted items", () => {
    expect(visibleNav([]).map((g) => g.group)).toEqual(["Home"]);
  });
});
