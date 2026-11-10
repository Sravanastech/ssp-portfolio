package com.sravanaparimi.profile.resumeaccess;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

/** Code generation, keyed hashing and HKDF subkey derivation. Never logs secrets or codes. */
@Component
public class OtpCrypto {
  public static final String DEV_SECRET = "dev-only-otp-secret-change-me-0123456789";
  static final int MIN_SECRET_BYTES = 32;
  private static final int CODE_SPACE = 1_000_000;

  private final SecureRandom random;
  private final byte[] codeKey;
  private final byte[] tokenKey;

  @Autowired
  public OtpCrypto(Environment env) {
    this(resolve(env), env.acceptsProfiles(Profiles.of("prod")), new SecureRandom());
  }

  private OtpCrypto(String secret, boolean prod, SecureRandom random) {
    if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES)
      throw new IllegalStateException("OTP secret must be at least 32 bytes");
    if (prod && DEV_SECRET.equals(secret))
      throw new IllegalStateException("Production must not use the development OTP secret");
    byte[] ikm = secret.getBytes(StandardCharsets.UTF_8);
    this.random = random;
    this.codeKey = hkdf(ikm, "otp-code");
    this.tokenKey = hkdf(ikm, "resume-token");
  }

  public static OtpCrypto of(String secret, boolean prod) {
    return new OtpCrypto(secret, prod, new SecureRandom());
  }

  static OtpCrypto of(String secret, boolean prod, SecureRandom random) {
    return new OtpCrypto(secret, prod, random);
  }

  private static String resolve(Environment env) {
    String secret = env.getProperty("profile.resume-otp.secret", "");
    boolean enabled = env.getProperty("profile.resume-otp.enabled", Boolean.class, false);
    if (secret.isBlank() && !enabled) {
      // Feature off: no persistent secret required; an ephemeral key keeps the beans valid.
      byte[] ephemeral = new byte[MIN_SECRET_BYTES];
      new SecureRandom().nextBytes(ephemeral);
      return HexFormat.of().formatHex(ephemeral);
    }
    return secret;
  }

  /** Uniform 6-digit code via rejection sampling of 20-bit draws; keeps leading zeros. */
  public String generateCode() {
    byte[] b = new byte[3];
    while (true) {
      random.nextBytes(b);
      int v = ((b[0] & 0x0F) << 16) | ((b[1] & 0xFF) << 8) | (b[2] & 0xFF);
      if (v < CODE_SPACE) return String.format("%06d", v);
    }
  }

  public byte[] hmac(String code, UUID challengeId) {
    return hmac(codeKey, (code + ":" + challengeId).getBytes(StandardCharsets.UTF_8));
  }

  public boolean matches(String code, UUID challengeId, byte[] expected) {
    return MessageDigest.isEqual(hmac(code, challengeId), expected);
  }

  byte[] codeKey() {
    return codeKey.clone();
  }

  byte[] tokenKey() {
    return tokenKey.clone();
  }

  /** HKDF-SHA256 (RFC 5869) with an empty salt and a single 32-byte output block. */
  private static byte[] hkdf(byte[] ikm, String info) {
    byte[] prk = hmac(new byte[32], ikm);
    byte[] in = info.getBytes(StandardCharsets.UTF_8);
    byte[] msg = Arrays.copyOf(in, in.length + 1);
    msg[in.length] = 1;
    return hmac(prk, msg);
  }

  private static byte[] hmac(byte[] key, byte[] data) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(key, "HmacSHA256"));
      return mac.doFinal(data);
    } catch (GeneralSecurityException ex) {
      throw new IllegalStateException("HMAC unavailable", ex);
    }
  }
}
