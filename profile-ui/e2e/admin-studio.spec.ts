import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { OWNER_PERMS, stubAuth0 } from "./admin-helpers";

const SCHEMA_DIR = "../profile-backend/src/main/resources/content-schema";
const schemas = readdirSync(SCHEMA_DIR)
  .filter((f) => f.endsWith(".schema.json"))
  .map((f) => JSON.parse(readFileSync(`${SCHEMA_DIR}/${f}`, "utf8")));
const siteCopy = JSON.parse(
  readFileSync("src/data/siteCopy.json", "utf8"),
) as Record<string, string>;

type Block = Record<string, unknown> & {
  id: string;
  type: string;
  version: number;
  position: number;
  published: Record<string, unknown> | null;
  draft: Record<string, unknown> | null;
  draftDeleted: boolean;
  pending: boolean;
};

const exp = (n: number, title: string, company: string): Block => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  type: "experience",
  collection: "experiences",
  slug: `experience-${n}`,
  position: n - 1,
  draft: null,
  published: {
    id: `experience-${n}`,
    year: "2016 – 2019",
    title,
    company,
    description: "Built things.",
  },
  draftDeleted: false,
  pending: false,
  version: 1,
  updatedAt: "2026-11-26T22:00:00Z",
  publishedAt: "2026-11-26T22:00:00Z",
});

type Opts = { conflict?: boolean; canPublish?: boolean };

/** Stateful mock of the studio + releases API. */
async function stubStudioApi(page: Page, opts: Opts = {}) {
  const saves: { changes: Record<string, unknown>[] }[] = [];
  const publishes: unknown[] = [];
  const blocks: Block[] = [
    exp(1, "Engineer", "Acme"),
    exp(2, "Senior Engineer", "Globex"),
    exp(3, "Lead Engineer", "Initech"),
    {
      id: "00000000-0000-4000-8000-0000000000a1",
      type: "page_text",
      collection: "copy",
      slug: "pages.HomePage",
      position: 0,
      draft: null,
      published: Object.fromEntries(
        Object.entries(siteCopy).filter(([k]) =>
          k.startsWith("pages.HomePage."),
        ),
      ),
      draftDeleted: false,
      pending: false,
      version: 1,
      updatedAt: "",
      publishedAt: "",
    },
  ];
  let releases: Record<string, unknown>[] = [];
  let polls = 0;
  let nextId = 100;
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const req = route.request();
      const { pathname } = new URL(req.url());
      const method = req.method();
      if (pathname === "/api/admin/me")
        return route.fulfill({
          json: {
            role: opts.canPublish === false ? "editor" : "owner",
            canPublish: opts.canPublish !== false,
            permissions:
              opts.canPublish === false
                ? OWNER_PERMS.filter((p) => p !== "content.publish")
                : OWNER_PERMS,
          },
        });
      if (pathname === "/api/admin/summary")
        return route.fulfill({ json: { openInquiries: 0 } });
      if (pathname === "/api/admin/studio" && method === "GET")
        return route.fulfill({
          json: {
            blocks,
            schemas,
            pendingCount: blocks.filter((b) => b.pending).length,
          },
        });
      if (pathname === "/api/admin/studio/save") {
        const body = req.postDataJSON() as {
          changes: Record<string, unknown>[];
        };
        saves.push(body);
        if (opts.conflict)
          return route.fulfill({
            status: 409,
            json: {
              status: 409,
              code: "block_conflict",
              detail: "Some items changed since you loaded them",
              ids: [body.changes[0].id],
            },
          });
        const out: Block[] = [];
        const removed: string[] = [];
        for (const c of body.changes) {
          let b = blocks.find((x) => x.id === c.id);
          if (!b) {
            b = {
              id: String(c.id),
              type: String(c.type),
              collection: "experiences",
              slug: `new-${nextId++}`,
              position: 0,
              draft: null,
              published: null,
              draftDeleted: false,
              pending: true,
              version: 1,
            } as unknown as Block;
            blocks.push(b);
          }
          if (c.delete) {
            blocks.splice(blocks.indexOf(b), 1);
            removed.push(b.id);
            continue;
          }
          if (c.draft) b.draft = c.draft as Block["draft"];
          if (typeof c.position === "number") b.position = c.position;
          b.pending = true;
          b.version += 1;
          out.push(b);
        }
        return route.fulfill({ json: { blocks: out, removed } });
      }
      if (pathname === "/api/admin/studio/preview")
        return route.fulfill({ json: { content: {} } });
      if (pathname === "/api/admin/releases" && method === "POST") {
        publishes.push(req.postDataJSON());
        for (const b of blocks) {
          if (b.draft) b.published = b.draft;
          b.draft = null;
          b.pending = false;
        }
        const r = {
          id: 7,
          status: "queued",
          note: (req.postDataJSON() as { note?: string } | null)?.note ?? null,
          createdBy: null,
          createdAt: "2026-11-26T22:12:00Z",
          finishedAt: null,
          runUrl: "https://github.com/example/actions/runs/1",
        };
        releases = [r];
        return route.fulfill({ status: 201, json: r });
      }
      if (pathname === "/api/admin/releases" && method === "GET") {
        if (releases[0] && releases[0].status !== "live") {
          polls += 1;
          releases[0].status =
            polls <= 1 ? "queued" : polls === 2 ? "building" : "live";
        }
        return route.fulfill({ json: releases });
      }
      if (pathname === "/api/health")
        return route.fulfill({ json: { status: "UP" } });
      return route.fulfill({ json: {} });
    },
  );
  return { saves, publishes, blocks };
}

test.describe("admin studio", () => {
  test.use({ serviceWorkers: "block" });

  test("edit enables Save, saves only the dirty block, then offers Publish", async ({
    page,
  }) => {
    await stubAuth0(page);
    const api = await stubStudioApi(page);
    await page.goto("/admin/content/about/experience");
    await expect(
      page.getByRole("heading", { name: "Studio", level: 1 }),
    ).toBeVisible();
    const save = page.getByRole("button", { name: "Save", exact: true });
    await expect(save).toBeDisabled();
    await expect(page.getByText("No unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: /^Engineer · Acme/ }).click();
    const title = page.getByLabel(/^Job title/).first();
    await title.fill("Principal Engineer");
    await expect(
      page.getByText("1 unsaved change", { exact: true }),
    ).toBeVisible();
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText("No unsaved changes")).toBeVisible();
    expect(api.saves).toHaveLength(1);
    expect(api.saves[0].changes).toHaveLength(1);
    expect(api.saves[0].changes[0]).toMatchObject({
      id: "00000000-0000-4000-8000-000000000001",
      version: 1,
      draft: { title: "Principal Engineer", company: "Acme" },
    });
    await expect(page.getByText("1 change not live")).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish…" })).toBeEnabled();
  });

  test("add, move and remove with undo send explicit positions", async ({
    page,
  }) => {
    await stubAuth0(page);
    const api = await stubStudioApi(page);
    await page.goto("/admin/content/about/experience");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    // New card is on top, open, first field focused.
    await expect(page.getByLabel(/^Dates/).first()).toBeFocused();
    await page
      .getByLabel(/^Dates/)
      .first()
      .fill("2020 – 2021");
    await page
      .getByLabel(/^Job title/)
      .first()
      .fill("Intern");
    await page
      .getByLabel(/^Company/)
      .first()
      .fill("Hooli");
    await page
      .getByLabel(/^What you did/)
      .first()
      .fill("Learned.");
    // Remove the second server item, undo it, then move the last one up.
    await page
      .getByRole("button", {
        name: "More actions for Senior Engineer · Globex",
      })
      .click();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(
      page.getByText("Removed “Senior Engineer · Globex”."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(
      page.getByRole("button", { name: /^Senior Engineer · Globex/ }).first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Move Lead Engineer · Initech up" })
      .click();
    await expect(page.getByText(/unsaved change/)).toContainText("unsaved");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("No unsaved changes")).toBeVisible();
    const changes = api.saves[0].changes;
    const pos = Object.fromEntries(
      changes.map((c) => [String(c.id), c.position]),
    );
    // order is now: new, Engineer, Lead, Senior; Lead keeps slot 2 so it is not resent
    expect(changes.find((c) => c.type === "experience")?.position).toBe(0);
    expect(changes).toHaveLength(3);
    expect(pos["00000000-0000-4000-8000-000000000001"]).toBe(1);
    expect(pos["00000000-0000-4000-8000-000000000002"]).toBe(3);
  });

  test("a stale version shows a per-item conflict and keeps the edit", async ({
    page,
  }) => {
    await stubAuth0(page);
    await stubStudioApi(page, { conflict: true });
    await page.goto("/admin/content/about/experience");
    await page.getByRole("button", { name: /^Engineer · Acme/ }).click();
    await page
      .getByLabel(/^Company/)
      .first()
      .fill("Acme 2");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "changed by someone else" }),
    ).toBeVisible();
    await expect(page.getByLabel(/^Company/).first()).toHaveValue("Acme 2");
    await expect(
      page.getByText("1 unsaved change", { exact: true }),
    ).toBeVisible();
  });

  test("blocked save lists problems in a focusable summary", async ({
    page,
  }) => {
    await stubAuth0(page);
    const api = await stubStudioApi(page);
    await page.goto("/admin/content/about/experience");
    await page.getByRole("button", { name: /^Engineer · Acme/ }).click();
    await page
      .getByLabel(/^Job title/)
      .first()
      .fill("");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const summary = page.getByRole("alert").filter({ hasText: "to fix" });
    await expect(summary).toBeFocused();
    await summary
      .getByRole("button", { name: /Job title is required/ })
      .click();
    await expect(page.getByLabel(/^Job title/).first()).toBeFocused();
    expect(api.saves).toHaveLength(0);
  });

  test("publish shows the review, then Queued to Live", async ({ page }) => {
    test.setTimeout(60000);
    await stubAuth0(page);
    const api = await stubStudioApi(page);
    await page.goto("/admin/content/about/experience");
    await page.getByRole("button", { name: /^Engineer · Acme/ }).click();
    await page
      .getByLabel(/^Company/)
      .first()
      .fill("Acme Corp");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Publish…" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Review before publishing",
    });
    await expect(dialog).toContainText("Company");
    await expect(dialog.locator("del")).toContainText("Acme");
    await expect(dialog.locator("ins")).toContainText("Acme Corp");
    await dialog.getByLabel(/^Note/).fill("Rename company");
    await dialog.getByRole("button", { name: "Publish to the site" }).click();
    expect(api.publishes).toEqual([{ note: "Rename company" }]);
    const strip = page.getByRole("status").filter({ hasText: "Release #7" });
    await expect(strip).toContainText("Queued");
    await expect(strip).toContainText("Live", { timeout: 15000 });
    await expect(page.getByText("0 changes not live")).toBeVisible();
  });

  test("editor without publish rights sees the banner and a disabled Publish", async ({
    page,
  }) => {
    await stubAuth0(page);
    await stubStudioApi(page, { canPublish: false });
    await page.goto("/admin/content/about/experience");
    await expect(page.getByText("Owner publishes your changes")).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish…" })).toBeDisabled();
  });

  test("page text uses human labels", async ({ page }) => {
    await stubAuth0(page);
    await stubStudioApi(page);
    await page.goto("/admin/content/home/hero");
    await expect(page.getByLabel("Headline, line 1")).toHaveValue(
      siteCopy["pages.HomePage.text.1"],
    );
  });

  test("a11y and no horizontal scroll at 375px", async ({ page }) => {
    await stubAuth0(page);
    await stubStudioApi(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/admin/content/about/experience");
    await page.getByRole("button", { name: /^Engineer · Acme/ }).click();
    await expect(page.getByLabel(/^Job title/).first()).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Go to section" }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("preview toggle renders the real page", async ({ page }) => {
    await stubAuth0(page);
    await stubStudioApi(page);
    await page.goto("/admin/content/about/experience");
    await page.getByRole("button", { name: "Preview" }).click();
    await expect(
      page.getByRole("complementary", { name: "Preview of the About page" }),
    ).toBeVisible();
  });
});
