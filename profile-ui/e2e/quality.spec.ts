import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const publicRoutes = [
  "/",
  "/work",
  "/about",
  "/contact",
  "/privacy",
  "/termsconditions",
];

for (const route of publicRoutes) {
  test(`${route} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:5173${route}`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter(
        ({ impact }) => impact === "critical" || impact === "serious",
      ),
    ).toEqual([]);
  });
}

test.describe("private resume is never public", () => {
  test("static build output contains no PDF files", async () => {
    const dist = resolve("dist");
    test.skip(!existsSync(dist), "dist/ not built");
    const pdfs: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.pdf$/i.test(entry.name)) pdfs.push(full);
      }
    };
    walk(dist);
    expect(pdfs).toEqual([]);
  });

  test("anonymous /resume is sent to Auth0 login, not a PDF", async ({
    page,
  }) => {
    const pdfRequests: string[] = [];
    page.on("request", (req) => {
      if (/\.pdf(\?|$)/i.test(req.url()) || req.url().includes("/api/resume"))
        pdfRequests.push(req.url());
    });
    // Never reach the real tenant; the redirect itself is the assertion.
    await page.route(/auth0\.com/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "login" }),
    );
    await page.goto("/resume", { waitUntil: "commit" });
    await page.waitForURL(/auth0\.com\/authorize/);
    expect(pdfRequests).toEqual([]);
  });

  test("public pages never request a PDF", async ({ page }) => {
    const pdfs: string[] = [];
    page.on("response", (res) => {
      const type = res.headers()["content-type"] ?? "";
      if (type.includes("application/pdf") || /\.pdf(\?|$)/i.test(res.url()))
        pdfs.push(res.url());
    });
    for (const route of publicRoutes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
    }
    expect(pdfs).toEqual([]);
  });

  test("legacy static PDF path serves no PDF bytes", async ({ request }) => {
    const response = await request.get("/private/Sravana_Parimi.pdf");
    expect(response.headers()["content-type"] ?? "").not.toContain(
      "application/pdf",
    );
    expect((await response.body()).subarray(0, 5).toString()).not.toBe("%PDF-");
  });
});

test("engineering motion is finite and respects reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Develop/ }).click();
  await expect(page.locator(".system-model")).toHaveAttribute(
    "data-layer",
    "3",
  );
  const path = page.locator(".workflow-connections > path").first();
  await expect
    .poll(() => path.evaluate((el) => getComputedStyle(el).animationName))
    .toBe("studio-draw");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => path.evaluate((el) => getComputedStyle(el).animationName))
    .toBe("none");
  await expect(
    page.getByRole("heading", { name: "Build the complete experience." }),
  ).toBeVisible();
});

for (const width of [1440, 390]) {
  test(`workflow signals and technical flow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.getByRole("button", { name: /Develop/ }).click();
    const flow = page.getByRole("img", {
      name: "Conceptual system: UI exchanges data with API and Database.",
    });
    await expect(flow).toBeVisible();
    await expect(flow.locator(".workflow-system-node")).toHaveCount(3);
    const signal = flow.locator(".workflow-signal").first();
    expect(
      await signal.evaluate(
        (el) => getComputedStyle(el).animationIterationCount,
      ),
    ).toBe("1");
    expect(
      await signal.evaluate((el) => getComputedStyle(el).animationDuration),
    ).toBe("0.85s");
    await page.getByRole("button", { name: /Deliver/ }).click();
    const release = page.getByRole("img", {
      name: "Conceptual delivery: UI, API, and Database connect to Production.",
    });
    await expect(release).toBeVisible();
    await expect(
      release.getByText("Production", { exact: true }),
    ).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of await release.locator(".workflow-signal").all()) {
      expect(
        await path.evaluate((el) => getComputedStyle(el).animationName),
      ).toBe("none");
    }
    await page
      .locator(".engineering-workflow")
      .screenshot({ path: `/tmp/workflow-animated-${width}.png` });
  });
}
