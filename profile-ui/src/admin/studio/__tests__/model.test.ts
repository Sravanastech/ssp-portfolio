import { describe, expect, it } from "vitest";
import type { BlockSchema, StudioBlock } from "@/api/studioApi";
import {
  buildChanges,
  fillTemplate,
  listItems,
  NO_EDITS,
  pathFromServer,
  validate,
} from "../model";
import { buildOutline, findSection, TEXT_LABELS } from "../outline";
import siteCopy from "@/data/siteCopy.json";
import { safeReturnPath } from "@/auth/returnTo";

const block = (id: string, position: number, data = { title: id }) =>
  ({
    id,
    type: "experience",
    collection: "experiences",
    slug: id,
    position,
    draft: null,
    published: data,
    draftDeleted: false,
    pending: false,
    version: 3,
    updatedAt: "",
    publishedAt: "",
  }) as StudioBlock;

const blocks = [block("a", 0), block("b", 1), block("c", 2)];

describe("buildChanges", () => {
  it("is empty when nothing changed", () => {
    expect(buildChanges(blocks, NO_EDITS).changes).toEqual([]);
  });
  it("ignores an edit equal to the server copy", () => {
    const edits = { ...NO_EDITS, drafts: { a: { title: "a" } } };
    expect(buildChanges(blocks, edits).changes).toEqual([]);
  });
  it("sends version and draft for edited blocks only", () => {
    const edits = { ...NO_EDITS, drafts: { b: { title: "B2" } } };
    expect(buildChanges(blocks, edits).changes).toEqual([
      { id: "b", version: 3, draft: { title: "B2" } },
    ]);
  });
  it("sends explicit positions for every moved item", () => {
    const edits = { ...NO_EDITS, order: { experience: ["b", "a", "c"] } };
    const { changes } = buildChanges(blocks, edits);
    expect(changes).toHaveLength(2);
    expect(changes).toContainEqual({ id: "a", version: 3, position: 1 });
    expect(changes).toContainEqual({ id: "b", version: 3, position: 0 });
  });
  it("puts a new item on top and shifts the others", () => {
    const edits = {
      ...NO_EDITS,
      newBlocks: { n: { type: "experience" } },
      drafts: { n: { title: "New" } },
      order: { experience: ["n", "a", "b", "c"] },
    };
    const { changes } = buildChanges(blocks, edits);
    const byId = Object.fromEntries(changes.map((c) => [c.id, c]));
    expect(byId.n).toMatchObject({ type: "experience", position: 0 });
    expect([byId.a.position, byId.b.position, byId.c.position]).toEqual([
      1, 2, 3,
    ]);
  });
  it("sends delete for removed server items and drops removed new items", () => {
    const edits = {
      ...NO_EDITS,
      deleted: { a: true as const, n: true as const },
      newBlocks: { n: { type: "experience" } },
    };
    expect(buildChanges(blocks, edits).changes).toEqual([
      { id: "a", version: 3, delete: true },
    ]);
  });
  it("lists items by position, skipping removed ones", () => {
    const edits = { ...NO_EDITS, deleted: { b: true as const } };
    expect(listItems(blocks, edits, "experience").map((i) => i.key)).toEqual([
      "a",
      "c",
    ]);
  });
});

describe("validate", () => {
  const schema: BlockSchema = {
    "x-studio": { type: "t", shape: "item" },
    type: "object",
    required: ["title", "year"],
    properties: {
      title: { type: "string", maxLength: 5, "x-ui": { label: "Title" } },
      year: { type: "integer", minimum: 1970, "x-ui": { label: "Year" } },
      tags: {
        type: "array",
        items: { type: "string", minLength: 1 },
        "x-ui": { label: "Tags" },
      },
    },
  };
  it("reports required, length and range by path", () => {
    expect(validate(schema, { title: "", year: "1900", tags: [""] })).toEqual({
      title: "Title is required.",
      year: "Year must be at least 1970.",
      "tags.0": "This field is required.",
    });
    expect(validate(schema, { title: "toolong", year: 2000 }).title).toMatch(
      /at most 5/,
    );
  });
  it("maps server paths", () => {
    expect(pathFromServer("$.outcomes[0].label")).toBe("outcomes.0.label");
    expect(pathFromServer("$.title")).toBe("title");
  });
});

describe("templates, outline, labels", () => {
  it("fills item templates", () => {
    expect(fillTemplate("{{title}} · {{company}}", { title: "Eng" })).toBe(
      "Eng",
    );
    expect(fillTemplate("{{a}} · {{b}}", { a: "x", b: "y" })).toBe("x · y");
  });
  it("covers every page-text key in the site copy with a label", () => {
    expect(Object.keys(TEXT_LABELS).sort()).toEqual(
      Object.keys(siteCopy).sort(),
    );
  });
  it("builds Pages -> Sections and resolves deep links", () => {
    const schemas = [
      {
        "x-studio": {
          type: "experience",
          shape: "item",
          page: "About",
          section: "Experience",
          order: 20,
        },
      },
    ] as BlockSchema[];
    const outline = buildOutline(schemas);
    expect(findSection(outline, "about", "experience")?.type).toBe(
      "experience",
    );
    expect(findSection(outline, "home", "hero")?.keys?.length).toBeGreaterThan(
      0,
    );
    expect(new Set(outline.map((s) => s.page))).toEqual(
      new Set(["Home", "Work", "About", "Contact", "Global"]),
    );
  });
  it("allows studio deep links as sign-in return targets only", () => {
    expect(safeReturnPath("/admin/content/about/experience")).toBe(
      "/admin/content/about/experience",
    );
    expect(safeReturnPath("/admin/content/raw")).toBe("/admin/content/raw");
    expect(safeReturnPath("/admin/content/../x//y")).toBe("/");
  });
});
