import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTACT_TIMEOUT_MS, submitContactInquiry } from "../ContactApi";

const inquiry = {
  name: "Test Person",
  email: "test@example.com",
  message: "A request for project information.",
  botcheck: false,
};
const transport = vi.fn<typeof fetch>();

describe("contact delivery request", () => {
  beforeEach(() => {
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

  it("posts contact page submissions to the backend for durable capture", async () => {
    vi.stubEnv("VITE_CONTENT_MODE", "api");
    transport.mockResolvedValue(
      new Response(JSON.stringify({ receipt: "saved", status: "accepted" }), {
        status: 202,
      }),
    );
    await expect(
      submitContactInquiry({ ...inquiry, name: "Database Capture" }),
    ).resolves.toMatchObject({ status: "accepted" });
    const [url, request] = transport.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(request?.method).toBe("POST");
    expect(request?.headers).toMatchObject({
      "Content-Type": "application/json",
    });
    expect(request?.headers).toHaveProperty("Idempotency-Key");
    expect(JSON.parse(request?.body as string)).toMatchObject({
      name: "Database Capture",
      email: inquiry.email,
      message: inquiry.message,
    });
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
