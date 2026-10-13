// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { createResumeHandler } from "./resume.mjs";

let privateKey;
let keySet;
beforeAll(async () => {
  const keys = await generateKeyPair("RS256");
  privateKey = keys.privateKey;
  const jwk = await exportJWK(keys.publicKey);
  keySet = createLocalJWKSet({
    keys: [{ ...jwk, kid: "test-key", alg: "RS256" }],
  });
});
async function token({
  audience = "resume-api",
  issuer = "https://example.auth0.com/",
  expiry = "2m",
} = {}) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setSubject("auth0|example")
    .setIssuedAt()
    .setExpirationTime(expiry)
    .setIssuer(issuer)
    .setAudience(audience)
    .sign(privateKey);
}
async function request(authorization, options = {}, method = "GET") {
  const result = { headers: {}, status: 0, body: null };
  const response = {
    setHeader(name, value) {
      result.headers[name] = value;
    },
    writeHead(status, headers) {
      result.status = status;
      Object.assign(result.headers, headers);
    },
    end(body) {
      result.body = body;
    },
  };
  const handler = createResumeHandler({
    domain: "example.auth0.com",
    audience: "resume-api",
    keySet,
    ...options,
  });
  await handler({ method, headers: { authorization } }, response);
  return result;
}
describe("private resume access", () => {
  it("rejects missing credentials and disables caching", async () => {
    const result = await request();
    expect(result.status).toBe(401);
    expect(result.headers["Cache-Control"]).toContain("no-store");
    expect(result.headers.Vary).toBe("Authorization");
  });
  it("rejects malformed credentials", async () => {
    expect((await request("Bearer fake-token")).status).toBe(401);
  });
  it("rejects a correctly signed token for another audience", async () => {
    expect(
      (await request(`Bearer ${await token({ audience: "other-api" })}`))
        .status,
    ).toBe(401);
  });
  it("rejects a correctly signed token from another issuer", async () => {
    expect(
      (
        await request(
          `Bearer ${await token({ issuer: "https://other.auth0.com/" })}`,
        )
      ).status,
    ).toBe(401);
  });
  it("rejects expired tokens", async () => {
    expect(
      (await request(`Bearer ${await token({ expiry: "-1m" })}`)).status,
    ).toBe(401);
  });
  it("rejects a token signed by an untrusted key", async () => {
    const rogueKeys = await generateKeyPair("RS256");
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setSubject("auth0|example")
      .setIssuedAt()
      .setExpirationTime("2m")
      .setIssuer("https://example.auth0.com/")
      .setAudience("resume-api")
      .sign(rogueKeys.privateKey);
    expect((await request(`Bearer ${forged}`)).status).toBe(401);
  });
  it("serves the private PDF only after token verification", async () => {
    const result = await request(`Bearer ${await token()}`);
    expect(result.status).toBe(200);
    expect(result.headers["Content-Type"]).toBe("application/pdf");
    expect(result.body.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.headers["Cache-Control"]).toContain("no-store");
  });
  it("fails closed when auth is not configured", async () => {
    expect(
      (await request(undefined, { domain: "", audience: "" })).status,
    ).toBe(503);
  });
  it("reports an unavailable private file without exposing paths", async () => {
    const result = await request(`Bearer ${await token()}`, {
      resumePath: "/nonexistent-private-resume.pdf",
    });
    expect(result.status).toBe(503);
    expect(result.body).not.toContain("nonexistent");
  });
  it("rejects unsupported methods", async () => {
    expect((await request(undefined, {}, "POST")).status).toBe(405);
  });
});
