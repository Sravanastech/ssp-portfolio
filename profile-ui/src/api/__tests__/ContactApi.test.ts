import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTACT_TIMEOUT_MS,
  ContactApiError,
  submitContactInquiry,
} from "../ContactApi";

const inquiry = {
  name: "Test Person",
  email: "test@example.com",
  message: "A request for project information.",
  botcheck: false,
};
const transport = vi.fn<typeof fetch>();

describe("contact delivery request (web3forms fallback)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_CONTACT_MODE", "web3forms");
    vi.stubEnv("VITE_WEB3FORMS_ACCESS_KEY", "test-key");
    vi.stubGlobal("fetch", transport);
    transport.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("sends the supported payload and requires explicit provider acceptance", async () => {
    transport.mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: "Accepted" })),
    );
    await expect(submitContactInquiry(inquiry)).resolves.toEqual({
      success: true,
      message: "Accepted",
    });
    const [url, request] = transport.mock.calls[0];
    expect(url).toBe("https://api.web3forms.com/submit");
    expect(request?.method).toBe("POST");
    expect(JSON.parse(request?.body as string)).toEqual({
      ...inquiry,
      access_key: "test-key",
      subject: "New Portfolio Inquiry from Test Person",
      from_name: "Sravana Portfolio",
    });
    expect(request?.signal).toBeInstanceOf(AbortSignal);
  });

  it("fails without configuration and never makes a network request", async () => {
    vi.stubEnv("VITE_WEB3FORMS_ACCESS_KEY", "  ");
    await expect(submitContactInquiry(inquiry)).rejects.toThrow(
      "temporarily unavailable",
    );
    expect(transport).not.toHaveBeenCalled();
  });

  it("blocks the honeypot without reporting success", async () => {
    await expect(
      submitContactInquiry({ ...inquiry, botcheck: true }),
    ).rejects.toThrow("could not be verified");
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([false, "true", undefined])(
    "rejects unsuccessful or malformed provider success: %s",
    async (success) => {
      transport.mockResolvedValue(new Response(JSON.stringify({ success })));
      await expect(submitContactInquiry(inquiry)).rejects.toThrow(
        "did not accept",
      );
    },
  );

  it("handles an HTTP service failure", async () => {
    transport.mockResolvedValue(new Response("unavailable", { status: 503 }));
    await expect(submitContactInquiry(inquiry)).rejects.toThrow(
      "service is unavailable",
    );
  });

  it("handles network failure without losing the distinction from success", async () => {
    transport.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(submitContactInquiry(inquiry)).rejects.toThrow(
      "Delivery could not be confirmed",
    );
  });

  it("handles an invalid JSON response", async () => {
    transport.mockResolvedValue(new Response("not json"));
    await expect(submitContactInquiry(inquiry)).rejects.toThrow(
      "Delivery could not be confirmed",
    );
  });

  it("aborts stalled requests and reports delivery as unconfirmed", async () => {
    vi.useFakeTimers();
    transport.mockImplementation(
      (_url, request) =>
        new Promise((_resolve, reject) => {
          request?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const result = expect(submitContactInquiry(inquiry)).rejects.toThrow(
      "timed out",
    );
    await vi.advanceTimersByTimeAsync(CONTACT_TIMEOUT_MS);
    await result;
    expect(transport.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});

describe("contact delivery request (backend api)", () => {
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status });

  beforeEach(() => {
    vi.stubGlobal("fetch", transport);
    transport.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("is the default mode and posts to /api/contact with token and idempotency key", async () => {
    transport.mockResolvedValue(
      json({ receipt: "r1", status: "accepted" }, 202),
    );
    await expect(
      submitContactInquiry(
        { ...inquiry, name: "Database Capture" },
        "turnstile-token",
      ),
    ).resolves.toMatchObject({ status: "accepted" });
    const [url, request] = transport.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(request?.method).toBe("POST");
    expect(request?.headers).toMatchObject({
      "Content-Type": "application/json",
    });
    expect(request?.headers).toHaveProperty("Idempotency-Key");
    expect(JSON.parse(request?.body as string)).toEqual({
      name: "Database Capture",
      email: inquiry.email,
      phone: null,
      message: inquiry.message,
      website: "",
      turnstileToken: "turnstile-token",
    });
  });

  it("refuses to send without a verification token", async () => {
    await expect(submitContactInquiry(inquiry)).rejects.toMatchObject({
      code: "captcha_required",
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it("reuses the idempotency key for the same text with a fresh token", async () => {
    const same = { ...inquiry, name: "Retry Person" };
    transport.mockResolvedValueOnce(json({ code: "captcha_failed" }, 403));
    await expect(submitContactInquiry(same, "t1")).rejects.toMatchObject({
      code: "captcha_failed",
    });
    transport.mockResolvedValueOnce(json({ status: "accepted" }, 202));
    await submitContactInquiry(same, "t2");
    const keyOf = (i: number) =>
      (transport.mock.calls[i][1]?.headers as Record<string, string>)[
        "Idempotency-Key"
      ];
    expect(keyOf(0)).toBe(keyOf(1));
    // success clears it, so a later identical message gets a new key
    transport.mockResolvedValueOnce(json({ status: "accepted" }, 202));
    await submitContactInquiry(same, "t3");
    expect(keyOf(2)).not.toBe(keyOf(0));
  });

  it.each([
    [429, { code: "rate_limited" }, "rate_limited", "Too many messages"],
    [403, { code: "captcha_failed" }, "captcha_failed", "verification check"],
    [400, { code: "captcha_required" }, "captcha_required", "verification"],
    [400, {}, "invalid", "Check the fields"],
    [409, {}, "conflict", "different text"],
    [503, {}, "unavailable", "temporarily unavailable"],
    [500, {}, "rejected", "not accepted"],
  ])("maps HTTP %s %j to %s", async (status, body, code, text) => {
    transport.mockResolvedValue(json(body, status));
    const error = await submitContactInquiry(
      { ...inquiry, name: `Err ${status}${code}` },
      "tok",
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ContactApiError);
    expect((error as ContactApiError).code).toBe(code);
    expect((error as Error).message).toContain(text);
  });

  it("handles a non-JSON error body", async () => {
    transport.mockResolvedValue(new Response("<html>", { status: 502 }));
    await expect(
      submitContactInquiry({ ...inquiry, name: "Html" }, "tok"),
    ).rejects.toMatchObject({ code: "rejected" });
  });

  it("reports network failure as unconfirmed delivery", async () => {
    transport.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      submitContactInquiry({ ...inquiry, name: "Offline" }, "tok"),
    ).rejects.toThrow("Delivery could not be confirmed");
  });

  it("aborts stalled requests", async () => {
    vi.useFakeTimers();
    transport.mockImplementation(
      (_url, request) =>
        new Promise((_resolve, reject) => {
          request?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const result = expect(
      submitContactInquiry({ ...inquiry, name: "Slow" }, "tok"),
    ).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(CONTACT_TIMEOUT_MS);
    await result;
  });

  it("flags the honeypot in the payload", async () => {
    transport.mockResolvedValue(json({ code: "x" }, 400));
    await submitContactInquiry(
      { ...inquiry, botcheck: true, name: "Bot" },
      "tok",
    ).catch(() => undefined);
    expect(JSON.parse(transport.mock.calls[0][1]?.body as string).website).toBe(
      "filled",
    );
  });
});
