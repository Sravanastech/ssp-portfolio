import { describe, expect, it } from "vitest";
import { visibleNav } from "../permissions";

describe("visibleNav", () => {
  it("editor sees Overview only", () => {
    expect(
      visibleNav(["content.edit", "insights.read"]).map((n) => n.label),
    ).toEqual(["Overview"]);
  });
  it("owner sees all", () => {
    expect(
      visibleNav(["team.manage", "audit.read"]).map((n) => n.label),
    ).toEqual(["Overview", "Team", "Audit log"]);
  });
});
