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
export async function stubAuth0(page: Page) {
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

export const OWNER_PERMS = [
  "content.edit",
  "content.publish",
  "media.upload",
  "inquiries.manage",
  "inquiries.reply",
  "insights.read",
  "people.read",
  "people.manage",
  "team.manage",
  "audit.read",
  "settings.manage",
];
