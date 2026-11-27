package com.sravanaparimi.profile.studio;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class ReleaseTokensTest {
  static final String SECRET = "unit-test-callback-secret-0123456789";
  static final Instant T0 = Instant.parse("2026-11-26T12:00:00Z");

  static ReleaseTokens at(Instant now, String secret) {
    return new ReleaseTokens(secret, Clock.fixed(now, ZoneOffset.UTC));
  }

  @Test
  void signedTokenVerifiesForItsReleaseAndExpiryOnly() {
    var tokens = at(T0, SECRET);
    long exp = tokens.newExpiry();
    assertEquals(T0.getEpochSecond() + 3600, exp);
    String token = tokens.sign(7, exp);
    assertEquals(64, token.length());
    assertTrue(tokens.verify(7, token, exp));
    assertFalse(tokens.verify(8, token, exp), "other release");
    assertFalse(tokens.verify(7, token, exp + 1), "tampered expiry");
    assertFalse(tokens.verify(7, token.replace(token.charAt(0), token.charAt(0) == 'a' ? 'b' : 'a'), exp));
  }

  @Test
  void expiredAndFarFutureTokensAreRejected() {
    long exp = at(T0, SECRET).newExpiry();
    String token = at(T0, SECRET).sign(1, exp);
    assertTrue(at(T0.plus(Duration.ofMinutes(59)), SECRET).verify(1, token, exp));
    assertFalse(at(T0.plus(Duration.ofMinutes(61)), SECRET).verify(1, token, exp));
    long far = T0.getEpochSecond() + 86_400;
    assertFalse(at(T0, SECRET).verify(1, at(T0, SECRET).sign(1, far), far), "longer than an hour");
  }

  @Test
  void differentSecretMissingSecretAndGarbageAreRejected() {
    long exp = at(T0, SECRET).newExpiry();
    String token = at(T0, SECRET).sign(1, exp);
    assertFalse(at(T0, SECRET + "x").verify(1, token, exp));
    var none = at(T0, "");
    assertFalse(none.configured());
    assertFalse(none.verify(1, token, exp));
    assertThrows(IllegalStateException.class, () -> none.sign(1, exp));
    assertFalse(at(T0, SECRET).verify(1, null, exp));
    assertFalse(at(T0, SECRET).verify(1, "z".repeat(64), exp));
    assertFalse(at(T0, SECRET).verify(1, "abc", exp));
  }
}
