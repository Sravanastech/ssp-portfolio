package com.sravanaparimi.profile.platform;

import java.nio.charset.StandardCharsets;
import java.util.Set;
import org.springframework.core.env.Environment;

public final class EnvironmentPolicy {
  public static void validate(Set<String> profiles, Environment env) {
    if (profiles.size() != 1 || !Set.of("dev", "test", "prod").containsAll(profiles))
      throw new IllegalStateException("Select exactly one profile: dev, test, prod");
    if (profiles.contains("test")) {
      String db = env.getProperty("spring.datasource.url", "").split("\\?", 2)[0];
      if (!db.matches("jdbc:postgresql://(localhost|127\\.0\\.0\\.1):[0-9]+/test_[a-zA-Z0-9_]+"))
        throw new IllegalStateException("Tests require an isolated localhost test_ database");
      if (!env.getProperty("profile.email.mode", "capture").equals("capture"))
        throw new IllegalStateException("Tests prohibit external email");
    }
    if (profiles.contains("prod")) {
      for (String key :
          Set.of(
              "spring.datasource.url",
              "spring.datasource.username",
              "spring.datasource.password",
              "profile.auth.issuer",
              "profile.auth.audience",
              "profile.media.root")) {
        String value = env.getProperty(key, "");
        if (value.isBlank()
            || value.contains("example")
            || value.contains("CHANGEME")
            || value.contains("localhost"))
          throw new IllegalStateException("Production requires configured " + key);
      }
      boolean contact = env.getProperty("profile.contact.enabled", Boolean.class, true);
      if (contact && !"provider".equals(env.getProperty("profile.email.mode")))
        throw new IllegalStateException(
            "Production contact API requires profile.email.mode=provider");
      if (contact && !env.getProperty("profile.notifications.enabled", Boolean.class, true))
        throw new IllegalStateException("Production contact API requires notifications enabled");
      if (contact && env.getProperty("profile.inquiries.ip-salt", "").length() < 16)
        throw new IllegalStateException(
            "Production requires profile.inquiries.ip-salt of at least 16 characters");
      if (contact) validateContactTurnstile(env);
      if ("provider".equals(env.getProperty("profile.email.mode"))) {
        for (String key :
            Set.of(
                "profile.email.endpoint",
                "profile.email.key",
                "profile.email.recipient",
                "profile.email.from")) {
          String value = env.getProperty(key, "");
          if (value.isBlank()
              || value.contains("example")
              || value.contains("CHANGEME")
              || value.contains("localhost"))
            throw new IllegalStateException("Production requires configured " + key);
        }
      }
      if (env.getProperty("profile.resume-otp.enabled", Boolean.class, false)) validateResumeOtp(env);
      if (!env.getProperty("profile.auth.issuer", "").startsWith("https://"))
        throw new IllegalStateException("Production identity must use HTTPS");
      if (!env.getProperty("spring.datasource.url", "").contains("sslmode=verify-full")
          && !env.getProperty("spring.datasource.url", "").contains("sslmode=require"))
        throw new IllegalStateException("Production database must verify TLS");
      if (!env.getProperty("profile.admin.require-mfa", "true").equals("true"))
        throw new IllegalStateException("Production administration requires MFA");
    }
  }

  /** The public contact form shares the resume OTP Turnstile configuration. */
  private static void validateContactTurnstile(Environment env) {
    String prefix = "profile.resume-otp.turnstile.";
    if (!env.getProperty(prefix + "enabled", Boolean.class, false))
      throw new IllegalStateException("Production contact API requires Turnstile enabled");
    String secret = env.getProperty(prefix + "secret", "");
    if (secret.isBlank() || secret.matches("[123]x0{20,}.*"))
      throw new IllegalStateException("Production contact API requires a real Turnstile secret");
    if (env.getProperty(prefix + "allowed-hostnames", "").isBlank())
      throw new IllegalStateException("Production contact API requires Turnstile hostnames");
    if (!env.getProperty(prefix + "require-action", Boolean.class, true))
      throw new IllegalStateException("Production must require the Turnstile action");
  }

  private static void validateResumeOtp(Environment env) {
    String prefix = "profile.resume-otp.";
    if (!"provider".equals(env.getProperty("profile.email.mode")))
      throw new IllegalStateException("Resume OTP requires profile.email.mode=provider");
    if (env.getProperty("profile.email.from", "").contains("resend.dev"))
      throw new IllegalStateException("Resume OTP requires a verified sender, not resend.dev");
    String emailKey = env.getProperty("profile.email.key", "").trim();
    if (emailKey.isEmpty() || emailKey.equalsIgnoreCase("none"))
      throw new IllegalStateException("Resume OTP requires a real profile.email.key");
    String secret = env.getProperty(prefix + "secret", "");
    if (secret.getBytes(StandardCharsets.UTF_8).length < 32
        || secret.contains("dev-only")
        || secret.contains("CHANGEME"))
      throw new IllegalStateException("Resume OTP requires a strong " + prefix + "secret");
    if (!env.getProperty(prefix + "turnstile.enabled", Boolean.class, false))
      throw new IllegalStateException("Resume OTP requires Turnstile to be enabled");
    String turnstile = env.getProperty(prefix + "turnstile.secret", "");
    // Cloudflare's published test secrets start with 1x/2x/3x followed by zeros.
    if (turnstile.isBlank() || turnstile.matches("[123]x0{20,}.*"))
      throw new IllegalStateException("Resume OTP requires a real Turnstile secret");
    if (env.getProperty(prefix + "turnstile.allowed-hostnames", "").isBlank())
      throw new IllegalStateException("Resume OTP requires Turnstile allowed hostnames");
    if (!env.getProperty(prefix + "turnstile.require-action", Boolean.class, true))
      throw new IllegalStateException("Production must require the Turnstile action");
    if (env.getProperty("profile.inquiries.ip-salt", "").length() < 16)
      throw new IllegalStateException(
          "Resume OTP requires profile.inquiries.ip-salt of at least 16 characters");
    if (env.getProperty("profile.admin.owner-sub", "").isBlank())
      throw new IllegalStateException("Resume OTP requires profile.admin.owner-sub");
    if (env.getProperty(prefix + "trusted-proxy-hops", Integer.class, 1) < 1)
      throw new IllegalStateException("Resume OTP requires trusted-proxy-hops of at least 1");
  }
}
