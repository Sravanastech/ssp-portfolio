package com.sravanaparimi.profile.resumeaccess;

import static org.junit.jupiter.api.Assertions.*;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.*;
import java.time.*;
import java.util.Date;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtException;

class ResumeTokenServiceTest {
  static final OtpCrypto CRYPTO = OtpCrypto.of("unit-test-secret-0123456789-abcdefghij", false);

  static ResumeTokenService service() {
    return new ResumeTokenService(CRYPTO, Clock.systemUTC());
  }

  static String sign(
      JWSAlgorithm alg, byte[] key, String iss, String aud, Instant iat, Instant exp)
      throws Exception {
    var claims =
        new JWTClaimsSet.Builder()
            .issuer(iss)
            .audience(aud)
            .subject("a@x.com")
            .jwtID("j")
            .issueTime(Date.from(iat))
            .expirationTime(Date.from(exp))
            .build();
    var jwt = new SignedJWT(new JWSHeader(alg), claims);
    jwt.sign(new MACSigner(key));
    return jwt.serialize();
  }

  @Test
  void issuedTokenParsesWithExpectedClaims() {
    var s = service();
    var claims = s.parse(s.issue("a@x.com"));
    assertEquals("a@x.com", claims.email());
    assertEquals(
        1800, Duration.between(claims.issuedAt(), claims.expiresAt()).toSeconds());
    assertEquals(1800, ResumeTokenService.TTL_SECONDS);
  }

  @Test
  void tamperedTokenIsRejected() {
    var s = service();
    String t = s.issue("a@x.com");
    String[] p = t.split("\\.");
    String forged = p[0] + "." + p[1] + "." + (p[2].charAt(0) == 'A' ? "B" : "A") + p[2].substring(1);
    assertThrows(JwtException.class, () -> s.parse(forged));
    assertThrows(JwtException.class, () -> s.parse("garbage"));
  }

  @Test
  void expiredTokenIsRejectedBeyondLeeway() {
    var past = new ResumeTokenService(CRYPTO, Clock.fixed(Instant.now().minusSeconds(3600), ZoneOffset.UTC));
    assertThrows(JwtException.class, () -> service().parse(past.issue("a@x.com")));
  }

  @Test
  void leewayAcceptsRecentlyExpiredToken() {
    var past =
        new ResumeTokenService(
            CRYPTO, Clock.fixed(Instant.now().minusSeconds(1800 + 10), ZoneOffset.UTC));
    assertDoesNotThrow(() -> service().parse(past.issue("a@x.com")));
  }

  @Test
  void algNoneIsRejected() {
    var plain =
        new PlainJWT(
                new JWTClaimsSet.Builder()
                    .issuer("profile-otp")
                    .audience("resume")
                    .subject("a@x.com")
                    .expirationTime(Date.from(Instant.now().plusSeconds(600)))
                    .build())
            .serialize();
    assertThrows(JwtException.class, () -> service().parse(plain));
  }

  @Test
  void wrongKeyAndWrongAlgorithmAreRejected() throws Exception {
    var now = Instant.now();
    byte[] otherKey = OtpCrypto.of("another-secret-0123456789-abcdefghijk", false).tokenKey();
    assertThrows(
        JwtException.class,
        () ->
            service()
                .parse(sign(JWSAlgorithm.HS256, otherKey, "profile-otp", "resume", now, now.plusSeconds(600))));
    // Right key, but HS512 instead of the pinned HS256.
    byte[] longKey = new byte[64];
    System.arraycopy(CRYPTO.tokenKey(), 0, longKey, 0, 32);
    assertThrows(
        JwtException.class,
        () ->
            service()
                .parse(sign(JWSAlgorithm.HS512, longKey, "profile-otp", "resume", now, now.plusSeconds(600))));
    // The code subkey must not validate tokens.
    assertThrows(
        JwtException.class,
        () ->
            service()
                .parse(sign(JWSAlgorithm.HS256, CRYPTO.codeKey(), "profile-otp", "resume", now, now.plusSeconds(600))));
  }

  @Test
  void wrongIssuerOrAudienceIsRejected() throws Exception {
    var now = Instant.now();
    byte[] key = CRYPTO.tokenKey();
    assertThrows(
        JwtException.class,
        () -> service().parse(sign(JWSAlgorithm.HS256, key, "other", "resume", now, now.plusSeconds(600))));
    assertThrows(
        JwtException.class,
        () -> service().parse(sign(JWSAlgorithm.HS256, key, "profile-otp", "api", now, now.plusSeconds(600))));
    assertDoesNotThrow(
        () -> service().parse(sign(JWSAlgorithm.HS256, key, "profile-otp", "resume", now, now.plusSeconds(600))));
  }

  @Test
  void issuerPeekSelectsOtpTokensOnly() {
    var s = service();
    assertTrue(ResumeTokenService.isOtpIssuer(s.issue("a@x.com")));
    assertFalse(ResumeTokenService.isOtpIssuer("garbage"));
  }
}
