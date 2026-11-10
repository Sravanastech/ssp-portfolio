package com.sravanaparimi.profile.resumeaccess;

public interface TurnstileVerifier {
  /** Returns true only when the token is valid; every error path must return false. */
  boolean verify(String token, String remoteIp);
}
