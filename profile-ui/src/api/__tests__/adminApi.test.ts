import { afterEach, describe, expect, it, vi } from "vitest";
import { adminFetch, AdminApiError } from "../adminApi";

const reply = (status: number, body?: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
    }),
  );

describe("adminFetch", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the bearer token and JSON body", async () => {
    const spy = reply(200, { ok: true });
    await adminFetch("tok", "/team/invites", {
      method: "POST",
      body: { email: "a@b.co" },
    });
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe("/api/admin/team/invites");
    expect(init).toMatchObject({
      method: "POST",
      cache: "no-store",
      body: '{"email":"a@b.co"}',
    });
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok",
    );
  });

  it("returns undefined for 204", async () => {
    reply(204);
    await expect(
      adminFetch("tok", "/team/x", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });

  it("maps machine codes to actionable messages", async () => {
    reply(403, { code: "mfa_required" });
    await expect(adminFetch("t", "/me")).rejects.toMatchObject({
      status: 403,
      code: "mfa_required",
      message: "This area needs multi-factor sign-in.",
    });
  });

  it("ignores unknown codes and handles 429", async () => {
    reply(500, { code: "weird" });
    const error = await adminFetch("t", "/me").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminApiError);
    expect((error as AdminApiError).code).toBeUndefined();
    reply(429);
    await expect(adminFetch("t", "/x")).rejects.toThrow(/Too many requests/);
  });
});
