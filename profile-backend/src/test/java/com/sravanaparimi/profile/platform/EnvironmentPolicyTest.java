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
}
