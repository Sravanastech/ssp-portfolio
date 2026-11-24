package com.sravanaparimi.profile.team;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

final class InviteTokens {
  private static final SecureRandom RNG = new SecureRandom();

  private InviteTokens() {}

  static String newToken() {
    byte[] b = new byte[32];
    RNG.nextBytes(b);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
  }

  static byte[] hash(String token) {
    try {
      return MessageDigest.getInstance("SHA-256")
          .digest(token.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
