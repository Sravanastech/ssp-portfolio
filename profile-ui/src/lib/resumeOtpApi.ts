import { z } from "zod";

/** Typed client for the resume email-code endpoints (frozen API contract). */
export type OtpErrorCode =
  | "invalid_request"
  | "captcha_failed"
  | "rate_limited"
  | "otp_unavailable"
  | "send_failed"
  | "invalid_code"
  | "locked"
  | "network"
  | "unknown";

const KNOWN: ReadonlySet<string> = new Set([
  "invalid_request",
  "captcha_failed",
  "rate_limited",
  "otp_unavailable",
  "send_failed",
  "invalid_code",
  "locked",
]);

export class OtpApiError extends Error {
  readonly code: OtpErrorCode;
  readonly status: number;
  readonly retryAfterSeconds?: number;
  readonly attemptsRemaining?: number;
  constructor(
    code: OtpErrorCode,
    status: number,
    extra: { retryAfterSeconds?: number; attemptsRemaining?: number } = {},
  ) {
    super(code);
    this.name = "OtpApiError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = extra.retryAfterSeconds;
    this.attemptsRemaining = extra.attemptsRemaining;
  }
}

const requestSchema = z.object({
  challengeId: z.string().uuid(),
  resendAfterSeconds: z.number().int().nonnegative(),
  expiresInSeconds: z.number().int().positive(),
});
const verifySchema = z.object({
  accessToken: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
});
const errorSchema = z
  .object({
    code: z.string().optional(),
    retryAfterSeconds: z.number().optional(),
    attemptsRemaining: z.number().optional(),
  })
  .passthrough();

export type OtpChallenge = z.infer<typeof requestSchema>;
export type OtpAccess = z.infer<typeof verifySchema>;

async function post<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "omit",
    });
  } catch {
    throw new OtpApiError("network", 0);
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    json = undefined;
  }
  if (!response.ok) {
    const parsed = errorSchema.safeParse(json);
    const data = parsed.success ? parsed.data : {};
    const header = Number(response.headers.get("Retry-After"));
    const code: OtpErrorCode =
      data.code && KNOWN.has(data.code)
        ? (data.code as OtpErrorCode)
        : "unknown";
    throw new OtpApiError(code, response.status, {
      retryAfterSeconds:
        data.retryAfterSeconds ??
        (Number.isFinite(header) && header > 0 ? header : undefined),
      attemptsRemaining: data.attemptsRemaining,
    });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new OtpApiError("unknown", response.status);
  return parsed.data;
}

export const requestOtp = (email: string, turnstileToken: string) =>
  post("/api/resume/otp/request", { email, turnstileToken }, requestSchema);

export const verifyOtp = (challengeId: string, code: string) =>
  post("/api/resume/otp/verify", { challengeId, code }, verifySchema);
