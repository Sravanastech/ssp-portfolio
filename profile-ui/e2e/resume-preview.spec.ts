import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { generateKeyPairSync, createSign, type JsonWebKey } from "node:crypto";
import { readFileSync } from "node:fs";

const pdf = readFileSync("e2e/fixtures/sample-resume.pdf");
const firebase = JSON.parse(readFileSync("firebase.json", "utf8"));
const csp: string = firebase.hosting.headers
  .find((h: { source: string }) => h.source === "**")
  .headers.find(
    (h: { key: string }) => h.key === "Content-Security-Policy",
  ).value;

const b64u = (input: Buffer | string) =>
  Buffer.from(input).toString("base64url");

/**
 * Stubs the Auth0 tenant end to end: silent-auth iframe, token endpoint, JWKS.
 * Nothing reaches the real tenant.
 */
async function stubAuth0(page: Page) {
  // The SDK only attempts silent sign-in when its "session exists" cookie is present.
  const clientId = readEnv("VITE_AUTH0_CLIENT_ID") ?? "portfolio-tests";
  await page
    .context()
    .addCookies(
      [
        `auth0.${clientId}.is.authenticated`,
        `_legacy_auth0.${clientId}.is.authenticated`,
      ].map((name) => ({ name, value: "true", url: "http://127.0.0.1:5173" })),
    );
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = { ...(publicKey.export({ format: "jwk" }) as JsonWebKey) };
  const kid = "e2e-key";
  let nonce = "";
  const clientIds = new Set<string>();
  await page.route(/\.auth0\.com\//, async (route) => {
    const url = new URL(route.request().url());
    const issuer = `${url.protocol}//${url.host}/`;
    if (url.pathname === "/authorize") {
      const params = url.searchParams;
      nonce = params.get("nonce") ?? "";
      clientIds.add(params.get("client_id") ?? "");
      const message = JSON.stringify({
        type: "authorization_response",
        response: { code: "stub-code", state: params.get("state") },
      });
      return route.fulfill({
        contentType: "text/html",
        body: `<script>parent.postMessage(${message}, "*")</script>`,
      });
    }
    if (url.pathname === "/.well-known/jwks.json") {
      return route.fulfill({
        json: { keys: [{ ...jwk, kid, alg: "RS256", use: "sig" }] },
      });
    }
    if (url.pathname === "/oauth/token") {
      const now = Math.floor(Date.now() / 1000);
      const header = b64u(JSON.stringify({ alg: "RS256", typ: "JWT", kid }));
      const payload = b64u(
        JSON.stringify({
          iss: issuer,
          sub: "auth0|e2e",
          aud: [...clientIds][0],
          iat: now,
          exp: now + 3600,
          nonce,
          email: "e2e@example.com",
          name: "E2E User",
        }),
      );
      const signature = createSign("RSA-SHA256")
        .update(`${header}.${payload}`)
        .sign(privateKey)
        .toString("base64url");
      return route.fulfill({
        json: {
          access_token: "stub-access-token",
          id_token: `${header}.${payload}.${signature}`,
          token_type: "Bearer",
          expires_in: 3600,
        },
      });
    }
    return route.fulfill({ status: 404, body: "" });
  });
}

async function stubApi(page: Page, resumeDelayMs = 0) {
  const requests: string[] = [];
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const { pathname } = new URL(route.request().url());
      requests.push(pathname);
      if (pathname === "/api/resume") {
        if (resumeDelayMs)
          await new Promise((r) => setTimeout(r, resumeDelayMs));
        return route.fulfill({
          status: 200,
          contentType: "application/pdf",
          body: pdf,
        });
      }
      if (pathname === "/api/health")
        return route.fulfill({ json: { status: "UP" } });
      return route.fulfill({ json: {} });
    },
  );
  return requests;
}

/**
 * Enforces the real Firebase CSP on the document when running against the production
 * build (the preview server sends no headers). Dev mode needs inline scripts for HMR,
 * so there violations are only observed.
 */
async function enforceFirebaseCsp(page: Page) {
  if (!process.env.PLAYWRIGHT_TEST_BUILD) return;
  await page.route(/\/resume\/?$/, async (route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        // Plain-http localhost cannot upgrade; the tenant host differs per environment.
        "content-security-policy": csp
          .replace("upgrade-insecure-requests", "")
          .replaceAll(
            "sravanastech.us.auth0.com",
            readEnv("VITE_AUTH0_DOMAIN") ?? "portfolio-tests.auth0.com",
          ),
      },
    });
  });
}

function readEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    try {
      const match = readFileSync(file, "utf8").match(
        new RegExp(`^${name}=(.+)$`, "m"),
      );
      if (match) return match[1].trim();
    } catch {
      /* file absent */
    }
  }
  return undefined;
}

async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(
        `${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber} ${e.sample}`,
      );
    });
  });
  const consoleViolations: string[] = [];
  page.on("console", (msg) => {
    if (/content security policy/i.test(msg.text()))
      consoleViolations.push(`${msg.location().url} ${msg.text()}`);
  });
  // zod probes `new Function("")` inside try/catch to choose its JIT path. The probe is
  // expected to be refused under this CSP and falls back; it is unrelated to pdf.js.
  const knownProbe = (entry: string) => /\/zod-[^/]*\.js/.test(entry);
  return async () =>
    [
      ...(await page.evaluate(
        () => (window as never as { __csp: string[] }).__csp,
      )),
      ...consoleViolations,
    ].filter((entry) => !knownProbe(entry));
}

for (const [name, size] of [
  ["desktop 1440px", { width: 1440, height: 900 }],
  ["phone 390px", { width: 390, height: 844 }],
] as const) {
  test(`resume preview renders a canvas at ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await stubAuth0(page);
    const apiRequests = await stubApi(page);
    await enforceFirebaseCsp(page);
    const violations = await watchViolations(page);
    // Silent auth only runs when the SDK mounts; /resume mounts it directly.
    await page.goto("/resume");

    const canvas = page.locator("figure.resume-preview canvas").first();
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const box = await canvas.boundingBox();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.height).toBeGreaterThan(200);
    expect(
      await canvas.evaluate((el: HTMLCanvasElement) => el.width),
    ).toBeGreaterThan(0);
    // The page is not blank: pdf.js painted dark text pixels onto the white sheet.
    expect(
      await canvas.evaluate((el: HTMLCanvasElement) => {
        const data = el
          .getContext("2d")!
          .getImageData(0, 0, el.width, el.height).data;
        for (let i = 0; i < data.length; i += 4)
          if (data[i] < 100 && data[i + 3] > 0) return true;
        return false;
      }),
    ).toBe(true);

    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("link", { name: "Download resume" }),
    ).toBeVisible();
    await expect(page.getByRole("figure")).toHaveAccessibleName(
      /Resume preview/,
    );
    await expect(page.locator("iframe[title='Resume PDF']")).toHaveCount(0);
    expect(apiRequests).toContain("/api/health");
    expect(await violations()).toEqual([]);
  });
}

test("slow server shows the waking-up notice, then the preview", async ({
  page,
}) => {
  await stubAuth0(page);
  await stubApi(page, 3200);
  await page.goto("/resume");
  await expect(page.locator(".resume-status")).toContainText(
    "Waking up the server",
    { timeout: 10_000 },
  );
  await expect(
    page.locator("figure.resume-preview canvas").first(),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Waking up the server")).toHaveCount(0);
});
