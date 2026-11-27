package com.sravanaparimi.profile.accounts;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Access refusal carrying a machine code the UI maps to an actionable message. */
public class AuthzException extends ResponseStatusException {
  private final String code;

  public AuthzException(HttpStatus status, String code, String reason) {
    super(status, reason);
    this.code = code;
  }

  public String code() {
    return code;
  }

  public static AuthzException forbidden() {
    return new AuthzException(HttpStatus.FORBIDDEN, "forbidden", "Your role does not allow this");
  }

  public static AuthzException mfaRequired() {
    return new AuthzException(
        HttpStatus.FORBIDDEN, "mfa_required", "Sign in again and complete MFA");
  }

  public static AuthzException notProvisioned() {
    return new AuthzException(
        HttpStatus.FORBIDDEN, "account_not_provisioned", "Open your account page once first");
  }

  public static AuthzException inviteUnavailable() {
    return new AuthzException(
        HttpStatus.GONE, "invite_unavailable", "This invite is expired, used, or revoked");
  }

  public static AuthzException noEmail() {
    return new AuthzException(
        HttpStatus.UNPROCESSABLE_ENTITY, "no_email", "This inquiry has no email address");
  }

  public static AuthzException replyRateLimited() {
    return new AuthzException(
        HttpStatus.TOO_MANY_REQUESTS, "reply_rate_limited", "Too many replies, try again later");
  }

  public static AuthzException emailFailed() {
    return new AuthzException(
        HttpStatus.BAD_GATEWAY, "email_failed", "The reply could not be sent");
  }
}
