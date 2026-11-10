import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const pdf = readFileSync("e2e/fixtures/sample-resume.pdf");
const EMAIL = "visitor@example.com";
const CHALLENGE = "3f2b8c1e-5d4a-4c8e-9a1b-0123456789ab";

/** Replaces Cloudflare's script with a stub widget that yields a token at once. */
async function stubTurnstile(page: Page) {
  await page.route(
    /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/,
    (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: `window.turnstile = {
        render(el, o) { setTimeout(() => o.callback("stub-token"), 0); return "w1"; },
        reset() {}, remove() {},
      };`,
      }),
  );
}

const noOverflow = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  return results.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact ?? ""),
  );
}

async function enterCode(page: Page, code: string) {
  await page.getByLabel("Digit 1 of 6").click();
  await page.keyboard.type(code);
}

test.describe("resume email code gate (stubbed API)", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("walks choose, email and code steps, then shows the resume", async ({
    page,
  }) => {
    await stubTurnstile(page);
    let verifyBody: unknown;
    await page.route("**/api/resume/otp/request", (route) =>
      route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          challengeId: CHALLENGE,
          resendAfterSeconds: 45,
          expiresInSeconds: 600,
        }),
      }),
    );
    await page.route("**/api/resume/otp/verify", (route) => {
      verifyBody = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "otp-e2e-token",
          expiresInSeconds: 1800,
        }),
      });
    });
    let bearer = "";
    await page.route("**/api/resume", (route) => {
      bearer = route.request().headers()["authorization"] ?? "";
      return route.fulfill({ contentType: "application/pdf", body: pdf });
    });
    await page.route("**/api/health", (route) => route.fulfill({ body: "{}" }));

    await page.goto("/resume");
    await expect(
      page.getByRole("button", { name: "Verify with email" }),
    ).toBeVisible();
    expect(await noOverflow(page)).toBe(true);
    expect(await axe(page)).toEqual([]);

    await page.getByRole("button", { name: "Verify with email" }).click();
    await expect(page.getByLabel("Email address")).toBeFocused();
    await page.getByLabel("Email address").fill(EMAIL);
    expect(await noOverflow(page)).toBe(true);
    expect(await axe(page)).toEqual([]);
    await page.getByRole("button", { name: "Send code" }).click();

    await expect(
      page.getByRole("group", { name: "Verification code" }),
    ).toBeVisible();
    await expect(page.getByLabel("Digit 1 of 6")).toBeFocused();
    expect(await noOverflow(page)).toBe(true);
    expect(await axe(page)).toEqual([]);
    for (const n of [1, 6]) {
      const box = await page.getByLabel(`Digit ${n} of 6`).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    await enterCode(page, "123456");
    await expect(
      page.getByRole("figure", { name: /Resume preview/ }),
    ).toBeVisible();
    expect(verifyBody).toEqual({ challengeId: CHALLENGE, code: "123456" });
    expect(bearer).toBe("Bearer otp-e2e-token");
    expect(page.url()).not.toContain("otp-e2e-token");
    // Token lives in sessionStorage only.
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
    expect(
      await page.evaluate(() => sessionStorage.getItem("resume.otp")),
    ).toContain("otp-e2e-token");
  });

  test("a wrong code focuses the error summary and reports attempts left", async ({
    page,
  }) => {
    await stubTurnstile(page);
    await page.route("**/api/resume/otp/request", (route) =>
      route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          challengeId: CHALLENGE,
          resendAfterSeconds: 45,
          expiresInSeconds: 600,
        }),
      }),
    );
    await page.route("**/api/resume/otp/verify", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ code: "invalid_code", attemptsRemaining: 4 }),
      }),
    );
    await page.route("**/api/health", (route) => route.fulfill({ body: "{}" }));
    await page.goto("/resume");
    await page.getByRole("button", { name: "Verify with email" }).click();
    await page.getByLabel("Email address").fill(EMAIL);
    await page.getByRole("button", { name: "Send code" }).click();
    await enterCode(page, "000000");
    const summary = page.getByTestId("error-summary");
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("4 attempts left");
    expect(await axe(page)).toEqual([]);
  });

  test("gate has no serious accessibility violations in dark mode", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await stubTurnstile(page);
    await page.route("**/api/health", (route) => route.fulfill({ body: "{}" }));
    await page.goto("/resume");
    await expect(
      page.getByRole("button", { name: "Verify with email" }),
    ).toBeVisible();
    expect(await axe(page)).toEqual([]);
    await page.getByRole("button", { name: "Verify with email" }).click();
    await expect(page.getByLabel("Email address")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test("an expired stored token returns to the gate with a notice", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      sessionStorage.setItem(
        "resume.otp",
        JSON.stringify({ token: "stale", exp: Date.now() + 600_000 }),
      ),
    );
    await page.route("**/api/health", (route) => route.fulfill({ body: "{}" }));
    await page.route("**/api/resume", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: "{}",
      }),
    );
    await page.goto("/resume");
    await expect(page.getByText(/session expired/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Verify with email" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => sessionStorage.getItem("resume.otp")),
    ).toBeNull();
  });
});

/**
 * Real backend (profile-backend dev profile, email.mode=capture, Cloudflare dummy keys,
 * internet for the Turnstile script). The code is read from the capture directory.
 * Opt in with E2E_OTP_BACKEND=1 and, if needed, OTP_CAPTURE_DIR.
 */
const captureDir =
  process.env.OTP_CAPTURE_DIR ?? "../profile-backend/.local/media/capture";

function latestCode(email: string): string {
  const files = readdirSync(captureDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ f, t: statSync(join(captureDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of files) {
    const mail = JSON.parse(readFileSync(join(captureDir, f), "utf8")) as {
      to: string;
      code: string;
    };
    if (mail.to === email) return mail.code;
  }
  throw new Error("no captured email for the test address");
}

test.describe("resume email code gate (real backend)", () => {
  test.skip(
    !process.env.E2E_OTP_BACKEND,
    "Needs the backend dev stack (profile-backend/scripts/dev.sh with capture email mode); set E2E_OTP_BACKEND=1 to run.",
  );

  async function request(page: Page, email: string) {
    await page.goto("/resume");
    await page.getByRole("button", { name: "Verify with email" }).click();
    await page.getByLabel("Email address").fill(email);
    // Managed Turnstile (dummy key) fills the token asynchronously.
    await expect(page.getByRole("button", { name: "Send code" })).toBeEnabled();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(
      page.getByRole("group", { name: "Verification code" }),
    ).toBeVisible();
  }

  test("happy path: code from the capture file opens the resume", async ({
    page,
  }) => {
    const email = `e2e-${Date.now()}@example.com`;
    await request(page, email);
    await enterCode(page, latestCode(email));
    await expect(
      page.getByRole("figure", { name: /Resume preview/ }),
    ).toBeVisible({
      timeout: 30_000,
    });
  });

  test("wrong codes run out of attempts and the real code no longer works", async ({
    page,
  }) => {
    const email = `e2e-lock-${Date.now()}@example.com`;
    await request(page, email);
    const real = latestCode(email);
    const wrong = real === "111111" ? "222222" : "111111";
    const summary = page.getByTestId("error-summary");
    for (let i = 0; i < 5; i++) {
      await Promise.all([
        page.waitForResponse(/\/api\/resume\/otp\/verify/),
        enterCode(page, wrong),
      ]);
      await expect(summary).toBeVisible();
      await expect(page.getByLabel("Digit 1 of 6")).toBeEnabled();
    }
    await expect(summary).toContainText(/new code|incorrect|too many/i);
    await enterCode(page, real);
    await expect(summary).toBeVisible();
    await expect(
      page.getByRole("figure", { name: /Resume preview/ }),
    ).toHaveCount(0);
  });
});
