import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OtpApiError, requestOtp, verifyOtp } from "../resumeOtpApi";

const ID = "3f2b8c1e-5d4a-4c8e-9a1b-0123456789ab";

function reply(status: number, body: unknown, headers: HeadersInit = {}) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    }),
  );
}

describe("resumeOtpApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts the request body as JSON without credentials", async () => {
    reply(202, {
      challengeId: ID,
      resendAfterSeconds: 45,
      expiresInSeconds: 600,
    });
    const out = await requestOtp("a@b.co", "ts-token");
    expect(out).toEqual({
      challengeId: ID,
      resendAfterSeconds: 45,
      expiresInSeconds: 600,
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/resume/otp/request");
    expect(init).toMatchObject({
      method: "POST",
      cache: "no-store",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
    });
    expect(JSON.parse(init!.body as string)).toEqual({
      email: "a@b.co",
      turnstileToken: "ts-token",
    });
  });

  it("verifies a code and returns the token", async () => {
    reply(200, { accessToken: "abc", expiresInSeconds: 1800 });
    await expect(verifyOtp(ID, "123456")).resolves.toEqual({
      accessToken: "abc",
      expiresInSeconds: 1800,
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/resume/otp/verify");
    expect(JSON.parse(init!.body as string)).toEqual({
      challengeId: ID,
      code: "123456",
    });
  });

  it.each([
    [400, "invalid_request"],
    [403, "captcha_failed"],
    [503, "otp_unavailable"],
    [503, "send_failed"],
  ])("maps %i %s", async (status, code) => {
    reply(status, { code, message: "x" });
    const err = await requestOtp("a@b.co", "t").catch((e) => e);
    expect(err).toBeInstanceOf(OtpApiError);
    expect(err.code).toBe(code);
    expect(err.status).toBe(status);
  });

  it("reads retry-after from body, then header", async () => {
    reply(429, { code: "rate_limited", retryAfterSeconds: 90 });
    let err = await requestOtp("a@b.co", "t").catch((e) => e);
    expect(err.code).toBe("rate_limited");
    expect(err.retryAfterSeconds).toBe(90);
    reply(429, { code: "locked" }, { "Retry-After": "3600" });
    err = await verifyOtp(ID, "000000").catch((e) => e);
    expect(err.code).toBe("locked");
    expect(err.retryAfterSeconds).toBe(3600);
  });

  it("exposes attemptsRemaining on invalid_code", async () => {
    reply(400, { code: "invalid_code", attemptsRemaining: 3 });
    const err = await verifyOtp(ID, "111111").catch((e) => e);
    expect(err.code).toBe("invalid_code");
    expect(err.attemptsRemaining).toBe(3);
  });

  it("falls back to unknown for unexpected errors", async () => {
    reply(500, { nope: true });
    const err = await verifyOtp(ID, "111111").catch((e) => e);
    expect(err.code).toBe("unknown");
  });

  it("reports network failure", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    const err = await requestOtp("a@b.co", "t").catch((e) => e);
    expect(err.code).toBe("network");
  });

  it("rejects malformed success bodies", async () => {
    reply(200, { accessToken: 5 });
    const err = await verifyOtp(ID, "111111").catch((e) => e);
    expect(err.code).toBe("unknown");
  });

  it("never logs", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    reply(400, { code: "invalid_code", attemptsRemaining: 1 });
    await verifyOtp(ID, "123456").catch(() => undefined);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
