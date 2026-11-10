package com.sravanaparimi.profile.resumeaccess;

import com.sravanaparimi.profile.platform.EmailGateway;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

/** OTP rules: spec sections 5 and 13. Never logs or returns email, code or token details. */
@Service
public class OtpService {
  public static final int RESEND_AFTER_SECONDS = 45;
  public static final int EXPIRES_IN_SECONDS = 600;
  static final int EMAIL_PER_15_MIN = 3;
  static final int EMAIL_PER_DAY = 6;
  static final int IP_SENDS_PER_HOUR = 10;
  static final int GLOBAL_PER_DAY = 80;
  static final int IP_FAILED_PER_HOUR = 20;
  static final Duration RETENTION = Duration.ofHours(24);
  static final int PURGE_BATCH = 500;
  private static final Pattern EMAIL =
      Pattern.compile("[a-z0-9._%+-]{1,64}@([a-z0-9]([a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,63}");

  public record Requested(UUID challengeId) {}

  private final OtpRepository otp;
  private final VisitorRepository visitors;
  private final EmailGateway mail;
  private final TurnstileVerifier turnstile;
  private final OtpCrypto crypto;
  private final ResumeTokenService tokens;
  private final boolean enabled;
  private final byte[] ipSalt;

  public OtpService(
      OtpRepository otp,
      VisitorRepository visitors,
      EmailGateway mail,
      TurnstileVerifier turnstile,
      OtpCrypto crypto,
      ResumeTokenService tokens,
      Environment env) {
    this.otp = otp;
    this.visitors = visitors;
    this.mail = mail;
    this.turnstile = turnstile;
    this.crypto = crypto;
    this.tokens = tokens;
    this.enabled = env.getProperty("profile.resume-otp.enabled", Boolean.class, false);
    this.ipSalt = env.getProperty("profile.inquiries.ip-salt", "").getBytes(StandardCharsets.UTF_8);
  }

  public Requested request(String rawEmail, String turnstileToken, String clientIp) {
    if (!enabled) throw OtpException.unavailable();
    String email = normalize(rawEmail);
    // CAPTCHA first: nothing below may write to the database or send mail without it.
    if (!turnstile.verify(turnstileToken, clientIp)) throw OtpException.captchaFailed();
    Instant now = Instant.now();
    otp.purgeOlderThan(now.minus(RETENTION), PURGE_BATCH);
    byte[] ipHash = ipHash(clientIp);
    if (otp.countSendsGlobal(now.minus(Duration.ofDays(1))) >= GLOBAL_PER_DAY)
      throw OtpException.unavailable();
    if (otp.countSendsByIp(ipHash, now.minus(Duration.ofHours(1))) >= IP_SENDS_PER_HOUR)
      throw OtpException.rateLimited(3600);
    var last = otp.latestSendByEmail(email);
    if (last.isPresent() && last.get().plusSeconds(RESEND_AFTER_SECONDS).isAfter(now))
      throw OtpException.rateLimited(
          Math.min(
              RESEND_AFTER_SECONDS,
              (Duration.between(now, last.get().plusSeconds(RESEND_AFTER_SECONDS)).toMillis()
                      + 999)
                  / 1000));
    if (otp.countSendsByEmail(email, now.minus(Duration.ofMinutes(15))) >= EMAIL_PER_15_MIN)
      throw OtpException.rateLimited(900);
    if (otp.countSendsByEmail(email, now.minus(Duration.ofDays(1))) >= EMAIL_PER_DAY)
      throw OtpException.rateLimited(3600);

    otp.invalidateOpenFor(email, ipHash);
    UUID id = UUID.randomUUID();
    String code = crypto.generateCode();
    otp.insert(
        new OtpRepository.Challenge(
            id, email, crypto.hmac(code, id), ipHash, now.plusSeconds(EXPIRES_IN_SECONDS)));
    try {
      mail.sendOtp(id, email, code);
    } catch (Exception ex) {
      if (ex instanceof InterruptedException) Thread.currentThread().interrupt();
      // Never delivered: delete (not just invalidate) so it counts toward no send limit.
      otp.discard(id);
      throw OtpException.sendFailed();
    }
    return new Requested(id);
  }

  /** Returns a fresh access token or throws {@link OtpException}. */
  public String verify(UUID challengeId, String code, String clientIp) {
    if (!enabled) throw OtpException.unavailable();
    var info = otp.find(challengeId).orElseThrow(() -> OtpException.invalidCode(0));
    byte[] ipHash = ipHash(clientIp);
    Instant hourAgo = Instant.now().minus(Duration.ofHours(1));
    // Only the per-IP limit: a third party must not be able to lock a victim's own challenge.
    // Each challenge has its own 5 attempts, and sends per email are capped (6/day).
    if (otp.failedVerifiesByIp(ipHash, hourAgo) >= IP_FAILED_PER_HOUR)
      throw OtpException.locked(3600);
    // Spend the attempt before comparing so parallel guesses still cost one attempt each.
    byte[] stored = otp.spendAttempt(challengeId).orElseThrow(() -> OtpException.invalidCode(0));
    if (!crypto.matches(code, challengeId, stored)) {
      int used = otp.find(challengeId).map(OtpRepository.Info::attempts).orElse(OtpRepository.MAX_ATTEMPTS);
      throw OtpException.invalidCode(Math.max(0, OtpRepository.MAX_ATTEMPTS - used));
    }
    if (!otp.consume(challengeId)) throw OtpException.invalidCode(0);
    visitors.upsert(info.email(), ipHash);
    return tokens.issue(info.email());
  }

  /** HMAC-SHA256 keyed by the secret IP salt; the raw address is never stored. */
  byte[] ipHash(String ip) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(ipSalt.length == 0 ? new byte[1] : ipSalt, "HmacSHA256"));
      return mac.doFinal(ClientIp.bucketKey(ip).getBytes(StandardCharsets.UTF_8));
    } catch (GeneralSecurityException ex) {
      throw new IllegalStateException("HMAC unavailable", ex);
    }
  }

  static String normalize(String raw) {
    if (raw == null) throw OtpException.invalidRequest();
    String email = raw.trim().toLowerCase(java.util.Locale.ROOT);
    if (email.length() > 254 || !EMAIL.matcher(email).matches() || email.contains(".."))
      throw OtpException.invalidRequest();
    return email;
  }
}
