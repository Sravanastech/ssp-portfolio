package com.sravanaparimi.profile.platform;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;
import tools.jackson.databind.json.JsonMapper;

class EmailGatewayReplyTest {
  static final JsonMapper JSON = JsonMapper.builder().build();
  @TempDir Path dir;

  MockEnvironment capture() {
    return new MockEnvironment()
        .withProperty("profile.email.mode", "capture")
        .withProperty("profile.media.root", dir.toString());
  }

  @Test
  void captureWritesReplyFileWithQuotedOriginal() throws Exception {
    var id = UUID.randomUUID();
    new EmailGateway(capture(), JSON).sendReply(id, "a@x.com", "Ann", "line1\nline2", "Thanks!");
    var node =
        JSON.readTree(Files.readString(dir.resolve("capture").resolve("reply-" + id + ".json")));
    assertEquals(id.toString(), node.get("replyId").asString());
    assertEquals("a@x.com", node.get("to").asString());
    assertEquals("Re: your message to Sravana S Parimi", node.get("subject").asString());
    String text = node.get("text").asString();
    assertTrue(text.startsWith("Hi Ann,\n\nThanks!\n\n"), text);
    assertTrue(text.contains("> line1\n> line2"), text);
    assertFalse(node.has("reply_to"));
  }

  @Test
  void providerPayloadSetsReplyToTextOnlyAndTruncatesOriginal() {
    var p =
        EmailGateway.replyPayload(
            "S <v@m.org>", "owner@m.org", "a@x.com", "Ann", "x".repeat(3000), "Body");
    assertEquals(List.of("a@x.com"), p.get("to"));
    assertEquals("owner@m.org", p.get("reply_to"));
    assertEquals("S <v@m.org>", p.get("from"));
    assertFalse(p.containsKey("html"));
    String text = (String) p.get("text");
    assertTrue(text.contains("> " + "x".repeat(2000)));
    assertFalse(text.contains("x".repeat(2001)));
  }

  @Test
  void rejectsBadRecipient() {
    var gw = new EmailGateway(capture(), JSON);
    assertThrows(
        IllegalArgumentException.class,
        () -> gw.sendReply(UUID.randomUUID(), "a@x.com\r\nBcc: z@x.com", "Ann", "m", "b"));
  }
}
