package com.sravanaparimi.profile.platform;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;
import tools.jackson.databind.json.JsonMapper;

class EmailGatewayOtpTest {
  static final JsonMapper JSON = JsonMapper.builder().build();
  @TempDir Path dir;

  @Test
  void captureModeWritesChallengeRecipientAndCode() throws Exception {
    var env =
        new MockEnvironment()
            .withProperty("profile.email.mode", "capture")
            .withProperty("profile.media.root", dir.toString());
    var id = UUID.randomUUID();
    new EmailGateway(env, JSON).sendOtp(id, "a@x.com", "012345");
    var node = JSON.readTree(Files.readString(dir.resolve("capture").resolve("otp-" + id + ".json")));
    assertEquals(id.toString(), node.get("challengeId").asString());
    assertEquals("a@x.com", node.get("to").asString());
    assertEquals("012345", node.get("code").asString());
  }

  @Test
  void providerPayloadHasCodeSubjectNoLinksAndSingleRecipient() {
    var p = EmailGateway.otpPayload("Sender <v@mail.example.org>", "a@x.com", "012345");
    assertEquals("Your verification code: 012345", p.get("subject"));
    assertEquals(List.of("a@x.com"), p.get("to"));
    assertEquals("Sender <v@mail.example.org>", p.get("from"));
    String text = (String) p.get("text"), html = (String) p.get("html");
    assertTrue(text.contains("012345") && html.contains("012345"));
    assertTrue(text.contains("10 minutes"));
    for (String body : List.of(text, html)) {
      assertFalse(body.contains("http"), body);
      assertFalse(body.contains("<a "), body);
    }
  }

  @Test
  void headerInjectionInRecipientIsRejected() {
    var env =
        new MockEnvironment()
            .withProperty("profile.email.mode", "capture")
            .withProperty("profile.media.root", dir.toString());
    var gw = new EmailGateway(env, JSON);
    assertThrows(
        IllegalArgumentException.class,
        () -> gw.sendOtp(UUID.randomUUID(), "a@x.com\r\nBcc: z@x.com", "012345"));
    assertThrows(
        IllegalArgumentException.class, () -> gw.sendOtp(UUID.randomUUID(), "a@x.com", "12 45"));
  }

  @Test
  void providerModeRejectsUnverifiedEndpoint() {
    var env =
        new MockEnvironment()
            .withProperty("profile.email.mode", "provider")
            .withProperty("profile.email.endpoint", "http://evil.example/emails")
            .withProperty("profile.email.from", "v@x.org")
            .withProperty("profile.email.key", "k");
    assertThrows(
        IllegalStateException.class,
        () -> new EmailGateway(env, JSON).sendOtp(UUID.randomUUID(), "a@x.com", "012345"));
  }
}
