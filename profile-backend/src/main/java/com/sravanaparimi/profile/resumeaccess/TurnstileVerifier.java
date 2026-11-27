package com.sravanaparimi.profile.resumeaccess;

public interface TurnstileVerifier {
  /** Returns true only when the token is valid; every error path must return false. */
  boolean verify(String token, String remoteIp);

  /**
   * Same as {@link #verify(String, String)} but also requires the widget action to match. The
   * default ignores the action so simple test doubles keep working.
   */
  default boolean verify(String token, String remoteIp, String action) {
    return verify(token, remoteIp);
  }
}
