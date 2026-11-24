import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { generateKeyPairSync, createSign, type JsonWebKey } from "node:crypto";
import { readFileSync } from "node:fs";

const b64u = (input: Buffer | string) =>
  Buffer.from(input).toString("base64url");

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

/** Stubs the Auth0 tenant (silent auth, token, JWKS); nothing reaches the real one. */
async function stubAuth0(page: Page) {
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

const OWNER_PERMS = [
  "content.edit",
  "content.publish",
  "media.upload",
  "inquiries.manage",
  "insights.read",
  "people.read",
  "people.manage",
  "team.manage",
  "audit.read",
  "settings.manage",
];
const TOKEN = "k".repeat(43);

async function stubAdminApi(page: Page, role: "owner" | "editor") {
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const req = route.request();
      const { pathname } = new URL(req.url());
      const method = req.method();
      if (pathname === "/api/admin/me")
        return route.fulfill({
          json:
            role === "owner"
              ? { role, canPublish: true, permissions: OWNER_PERMS }
              : {
                  role,
                  canPublish: false,
                  permissions: ["content.edit", "insights.read"],
                },
        });
      if (pathname === "/api/admin/team" && method === "GET")
        return route.fulfill({
          json: {
            members: [
              {
                accountId: "o1",
                firstName: "Own",
                lastName: "Er",
                email: "owner@example.com",
                role: "owner",
                canPublish: true,
                since: "2026-01-01T00:00:00Z",
              },
              {
                accountId: "e1",
                firstName: "Ed",
                lastName: "Itor",
                email: "editor@example.com",
                role: "editor",
                canPublish: false,
                since: "2026-02-01T00:00:00Z",
              },
            ],
            invites: [],
          },
        });
      if (pathname === "/api/admin/team/invites" && method === "POST")
        return route.fulfill({
          status: 201,
          json: { id: "i1", token: TOKEN, expiresAt: "2026-12-01T00:00:00Z" },
        });
      if (pathname === "/api/admin/drafts")
        return route.fulfill({ json: [{ id: 1, version: 1, content: {} }] });
      if (pathname === "/api/admin/resume-visitors")
        return route.fulfill({
          json: { items: [], page: 0, size: 25, total: 0 },
        });
      if (pathname === "/api/health")
        return route.fulfill({ json: { status: "UP" } });
      return route.fulfill({ json: {} });
    },
  );
}

test.describe("admin team console", () => {
  // A registered service worker would bypass page.route on reloads.
  test.use({ serviceWorkers: "block" });

  test("editor sees Overview only and is told Team is off limits", async ({
    page,
  }) => {
    await stubAuth0(page);
    await stubAdminApi(page, "editor");
    await page.goto("/admin");
    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Team" })).toHaveCount(0);
    await page.goto("/admin/team");
    await expect(page.getByRole("alert")).toContainText(
      "Your role does not include this area.",
    );
  });

  test("owner invites an editor and sees the link once; Team passes axe", async ({
    page,
  }) => {
    await stubAuth0(page);
    await stubAdminApi(page, "owner");
    await page.goto("/admin");
    await page
      .getByRole("navigation", { name: "Admin" })
      .getByRole("link", { name: "Team" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Team", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("editor@example.com")).toBeVisible();

    // Audit the settled page (see quality.spec.ts): wait for finite running animations.
    await page.evaluate(() =>
      Promise.race([
        Promise.all(
          document
            .getAnimations()
            .filter(
              (a) =>
                a.playState === "running" &&
                a.effect?.getComputedTiming().iterations !== Infinity,
            )
            .map((a) => a.finished.catch(() => undefined)),
        ),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]),
    );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter(
        ({ impact }) => impact === "critical" || impact === "serious",
      ),
    ).toEqual([]);

    await page.getByLabel("Email").fill("new.editor@example.com");
    await page.getByRole("button", { name: "Send invite" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Invite link")).toHaveValue(
      new RegExp(`/admin/invite#token=${TOKEN}$`),
    );
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toHaveCount(0);
  });
});
