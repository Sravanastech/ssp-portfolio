package com.sravanaparimi.profile.platform;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class EnvironmentPolicyTest {
  @Test
  void noProfileCannotSilentlyEnableDevelopment() {
    assertThrows(
        IllegalStateException.class,
        () -> EnvironmentPolicy.validate(Set.of(), new MockEnvironment()));
  }

  @Test
  void combinedEnvironmentsCannotShareData() {
    assertThrows(
        IllegalStateException.class,
        () -> EnvironmentPolicy.validate(Set.of("dev", "prod"), new MockEnvironment()));
  }

  @Test
  void productionMustProvideRealSettings() {
    assertThrows(
        IllegalStateException.class,
        () -> EnvironmentPolicy.validate(Set.of("prod"), new MockEnvironment()));
  }

  @Test
  void testsCannotUseRemoteDatabase() {
    assertThrows(
        IllegalStateException.class,
        () ->
            EnvironmentPolicy.validate(
                Set.of("test"),
                new MockEnvironment()
                    .withProperty(
                        "spring.datasource.url",
                        "jdbc:postgresql://production.example.com/profile")));
  }

  @Test
  void developmentIsExplicit() {
    assertDoesNotThrow(() -> EnvironmentPolicy.validate(Set.of("dev"), new MockEnvironment()));
  }

  static MockEnvironment prod() {
    return new MockEnvironment()
        .withProperty(
            "spring.datasource.url",
            "jdbc:postgresql://db.supabase.co:5432/postgres?sslmode=require")
        .withProperty("spring.datasource.username", "app")
        .withProperty("spring.datasource.password", "pw")
        .withProperty("profile.auth.issuer", "https://tenant.auth0.com/")
        .withProperty("profile.auth.audience", "api")
        .withProperty("profile.media.root", "/var/lib/profile/media")
        .withProperty("profile.contact.enabled", "false");
  }

  @Test
  void hybridProductionWithContactOffIsValid() {
    assertDoesNotThrow(() -> EnvironmentPolicy.validate(Set.of("prod"), prod()));
  }

  @Test
  void productionContactRejectsCaptureMode() {
    assertThrows(
        IllegalStateException.class,
        () ->
            EnvironmentPolicy.validate(
                Set.of("prod"),
                prod()
                    .withProperty("profile.contact.enabled", "true")
                    .withProperty("profile.email.mode", "capture")
                    .withProperty("profile.inquiries.ip-salt", "0123456789abcdef")));
  }

  @Test
  void productionContactRequiresIpSalt() {
    assertThrows(
        IllegalStateException.class,
        () ->
            EnvironmentPolicy.validate(
                Set.of("prod"),
                prod()
                    .withProperty("profile.contact.enabled", "true")
                    .withProperty("profile.email.mode", "provider")
                    .withProperty("profile.notifications.enabled", "true")));
  }

  static MockEnvironment otpProd() {
    return prod()
        .withProperty("profile.resume-otp.enabled", "true")
        .withProperty("profile.email.mode", "provider")
        .withProperty("profile.email.endpoint", "https://api.resend.com/emails")
        .withProperty("profile.email.key", "re_real_key")
        .withProperty("profile.email.recipient", "admin@sravanasparimi.com")
        .withProperty("profile.email.from", "Sravana <verify@mail.sravanasparimi.com>")
        .withProperty("profile.resume-otp.secret", "prod-secret-0123456789-0123456789-abcdef")
        .withProperty("profile.resume-otp.turnstile.enabled", "true")
        .withProperty("profile.resume-otp.turnstile.secret", "0x4AAAAAAArealsecretvalue")
        .withProperty("profile.resume-otp.turnstile.allowed-hostnames", "sravanasparimi.com")
        .withProperty("profile.resume-otp.turnstile.require-action", "true")
        .withProperty("profile.inquiries.ip-salt", "0123456789abcdef")
        .withProperty("profile.admin.owner-sub", "auth0|owner");
  }

  @Test
  void productionOtpFullyConfiguredIsValid() {
    assertDoesNotThrow(() -> EnvironmentPolicy.validate(Set.of("prod"), otpProd()));
  }

  @Test
  void productionOtpDisabledNeedsNoOtpSettings() {
    assertDoesNotThrow(
        () ->
            EnvironmentPolicy.validate(
                Set.of("prod"), prod().withProperty("profile.resume-otp.enabled", "false")));
  }

  static void assertOtpRejected(String key, String value) {
    var env = otpProd().withProperty(key, value);
    assertThrows(
        IllegalStateException.class,
        () -> EnvironmentPolicy.validate(Set.of("prod"), env),
        key + "=" + value);
  }

  @Test
  void productionOtpRejectsUnsafeSettings() {
    assertOtpRejected("profile.email.mode", "capture");
    assertOtpRejected("profile.email.from", "onboarding@resend.dev");
    assertOtpRejected("profile.email.key", "none");
    assertOtpRejected("profile.email.key", "NoNe");
    assertOtpRejected("profile.email.key", " ");
    assertOtpRejected("profile.resume-otp.secret", "");
    assertOtpRejected("profile.resume-otp.secret", "too-short");
    assertOtpRejected("profile.resume-otp.secret", "dev-only-otp-secret-change-me-0123456789");
    assertOtpRejected("profile.resume-otp.turnstile.enabled", "false");
    assertOtpRejected("profile.resume-otp.turnstile.secret", "");
    assertOtpRejected("profile.resume-otp.turnstile.secret", "1x0000000000000000000000000000000AA");
    assertOtpRejected("profile.resume-otp.turnstile.secret", "2x0000000000000000000000000000000AA");
    assertOtpRejected("profile.resume-otp.turnstile.allowed-hostnames", "");
    assertOtpRejected("profile.resume-otp.turnstile.require-action", "false");
    assertOtpRejected("profile.inquiries.ip-salt", "short");
    assertOtpRejected("profile.admin.owner-sub", "");
    assertOtpRejected("profile.resume-otp.trusted-proxy-hops", "0");
  }
}
