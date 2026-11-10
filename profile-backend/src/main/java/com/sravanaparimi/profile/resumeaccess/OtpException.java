package com.sravanaparimi.profile.resumeaccess;

/** Expected OTP failure carrying the frozen API error code. Message never holds user data. */
public class OtpException extends RuntimeException {
  private final int status;
  private final String code;
  private final Long retryAfterSeconds;
  private final Integer attemptsRemaining;

  private OtpException(int status, String code, Long retryAfter, Integer attemptsRemaining) {
    super(code, null, false, false);
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfter;
    this.attemptsRemaining = attemptsRemaining;
  }

  public static OtpException invalidRequest() {
    return new OtpException(400, "invalid_request", null, null);
  }

  public static OtpException captchaFailed() {
    return new OtpException(403, "captcha_failed", null, null);
  }

  public static OtpException rateLimited(long retryAfterSeconds) {
    return new OtpException(429, "rate_limited", Math.max(1, retryAfterSeconds), null);
  }

  public static OtpException locked(long retryAfterSeconds) {
    return new OtpException(429, "locked", Math.max(1, retryAfterSeconds), null);
  }

  public static OtpException unavailable() {
    return new OtpException(503, "otp_unavailable", null, null);
  }

  public static OtpException sendFailed() {
    return new OtpException(503, "send_failed", null, null);
  }

  public static OtpException invalidCode(int attemptsRemaining) {
    return new OtpException(400, "invalid_code", null, attemptsRemaining);
  }

  public int status() {
    return status;
  }

  public String code() {
    return code;
  }

  public Long retryAfterSeconds() {
    return retryAfterSeconds;
  }

  public Integer attemptsRemaining() {
    return attemptsRemaining;
  }
}
