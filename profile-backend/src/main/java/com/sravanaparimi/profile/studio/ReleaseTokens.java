package com.sravanaparimi.profile.studio;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Short-lived per-release credential for the CI run: HMAC-SHA256(secret, "release:{id}:{expires}").
 * It only opens the two public release callbacks for that one release, for at most an hour.
 */
@Component
public class ReleaseTokens {
  static final long VALID_SECONDS = 3600;
  private static final long MAX_FUTURE_SECONDS = VALID_SECONDS + 300;

  private final byte[] secret;
  private final Clock clock;

  @Autowired
  public ReleaseTokens(@Value("${profile.github.callback-secret:}") String secret) {
    this(secret, Clock.systemUTC());
  }

  ReleaseTokens(String secret, Clock clock) {
    this.secret = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
    this.clock = clock;
  }

  public boolean configured() {
    return secret.length >= 16;
  }

  /** Epoch second after which a token issued now is no longer accepted. */
  public long newExpiry() {
    return clock.instant().getEpochSecond() + VALID_SECONDS;
  }

  public String sign(long releaseId, long expiresEpoch) {
    if (!configured()) throw new IllegalStateException("profile.github.callback-secret is not set");
    return HexFormat.of().formatHex(mac(releaseId, expiresEpoch));
  }

  /** Constant-time check; false for a missing secret, bad format, wrong release or expiry. */
  public boolean verify(long releaseId, String token, long expiresEpoch) {
    if (!configured() || token == null || token.length() != 64) return false;
    long now = clock.instant().getEpochSecond();
    if (expiresEpoch <= now || expiresEpoch > now + MAX_FUTURE_SECONDS) return false;
    byte[] given;
    try {
      given = HexFormat.of().parseHex(token);
    } catch (IllegalArgumentException e) {
      return false;
    }
    return MessageDigest.isEqual(given, mac(releaseId, expiresEpoch));
  }

  private byte[] mac(long releaseId, long expiresEpoch) {
    try {
      var mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret, "HmacSHA256"));
      return mac.doFinal(
          ("release:" + releaseId + ":" + expiresEpoch).getBytes(StandardCharsets.UTF_8));
    } catch (GeneralSecurityException e) {
      throw new IllegalStateException(e);
    }
  }
}
