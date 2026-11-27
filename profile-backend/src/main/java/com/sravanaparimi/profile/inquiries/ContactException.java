package com.sravanaparimi.profile.inquiries;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** A rejected contact submission carrying a stable machine-readable code for the UI. */
public class ContactException extends ResponseStatusException {
  private final String code;
  private final Integer retryAfterSeconds;

  public ContactException(HttpStatus status, String code, Integer retryAfterSeconds) {
    super(status, "Request rejected");
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  public String code() {
    return code;
  }

  public Integer retryAfterSeconds() {
    return retryAfterSeconds;
  }
}
