package com.sravanaparimi.profile.platform;

import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
public class EmailGateway {
  private final Environment env;
  private final JsonMapper json;
  private final HttpClient client =
      HttpClient.newBuilder()
          .connectTimeout(Duration.ofSeconds(3))
          .followRedirects(HttpClient.Redirect.NEVER)
          .build();

  public EmailGateway(Environment env, JsonMapper json) {
    this.env = env;
    this.json = json;
  }

  public void send(UUID eventId, Map<String, Object> inquiry) throws Exception {
    if (env.getRequiredProperty("profile.email.mode").equals("capture")) {
      Path dir =
          Path.of(env.getRequiredProperty("profile.media.root"))
              .toAbsolutePath()
              .resolve("capture");
      Files.createDirectories(dir);
      try {
        Files.writeString(
            dir.resolve(eventId + ".json"),
            json.writeValueAsString(inquiry),
            StandardOpenOption.CREATE_NEW);
      } catch (FileAlreadyExistsException ignored) {
      }
      return;
    }
    String endpoint = env.getRequiredProperty("profile.email.endpoint");
    if (!endpoint.equals("https://api.resend.com/emails"))
      throw new IllegalStateException("Unverified provider");
    var payload =
        Map.of(
            "from",
            env.getRequiredProperty("profile.email.from"),
            "to",
            List.of(env.getRequiredProperty("profile.email.recipient")),
            "subject",
            "New portfolio inquiry",
            "text",
            "Name: "
                + inquiry.get("name")
                + "\nEmail: "
                + inquiry.get("email")
                + "\nPhone: "
                + inquiry.get("phone")
                + "\n\n"
                + inquiry.get("message"));
    var req =
        HttpRequest.newBuilder(URI.create(endpoint))
            .timeout(Duration.ofSeconds(10))
            .header("Authorization", "Bearer " + env.getRequiredProperty("profile.email.key"))
            .header("Idempotency-Key", eventId.toString())
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)))
            .build();
    var response = client.send(req, HttpResponse.BodyHandlers.discarding());
    if (response.statusCode() < 200 || response.statusCode() > 299)
      throw new IllegalStateException("Provider rejected notification");
  }

  /**
   * Sends a one-time code. Capture mode writes {challengeId,to,code} for dev/test; provider mode
   * posts a plain-text and minimal-HTML message with no links. Never logs the code or recipient.
   */
  public void sendOtp(UUID challengeId, String to, String code) throws Exception {
    if (to == null || !to.matches("[^\\s<>\"',;]{1,254}"))
      throw new IllegalArgumentException("Invalid recipient");
    if (code == null || !code.matches("[0-9]{6}"))
      throw new IllegalArgumentException("Invalid code");
    if (env.getRequiredProperty("profile.email.mode").equals("capture")) {
      Path dir =
          Path.of(env.getRequiredProperty("profile.media.root"))
              .toAbsolutePath()
              .resolve("capture");
      Files.createDirectories(dir);
      Files.writeString(
          dir.resolve("otp-" + challengeId + ".json"),
          json.writeValueAsString(
              Map.of("challengeId", challengeId.toString(), "to", to, "code", code)));
      return;
    }
    String endpoint = env.getRequiredProperty("profile.email.endpoint");
    if (!endpoint.equals("https://api.resend.com/emails"))
      throw new IllegalStateException("Unverified provider");
    var req =
        HttpRequest.newBuilder(URI.create(endpoint))
            .timeout(Duration.ofSeconds(10))
            .header("Authorization", "Bearer " + env.getRequiredProperty("profile.email.key"))
            .header("Idempotency-Key", "otp-" + challengeId)
            .header("Content-Type", "application/json")
            .POST(
                HttpRequest.BodyPublishers.ofString(
                    json.writeValueAsString(
                        otpPayload(env.getRequiredProperty("profile.email.from"), to, code))))
            .build();
    var response = client.send(req, HttpResponse.BodyHandlers.discarding());
    if (response.statusCode() < 200 || response.statusCode() > 299)
      throw new IllegalStateException("Provider rejected verification email");
  }

  static final String REPLY_SUBJECT = "Re: your message to Sravana S Parimi";

  /**
   * Sends an owner reply to a visitor. Capture mode writes reply-&lt;id&gt;.json; provider mode
   * posts plain text with reply_to set to the owner inbox. Never logs recipient or body.
   */
  public void sendReply(
      UUID replyId, String to, String visitorName, String originalMessage, String body)
      throws Exception {
    if (to == null || !to.matches("[^\\s<>\"',;]{1,254}"))
      throw new IllegalArgumentException("Invalid recipient");
    var payload =
        replyPayload(
            env.getProperty("profile.email.from", ""),
            env.getProperty("profile.email.recipient", ""),
            to,
            visitorName,
            originalMessage,
            body);
    if (env.getRequiredProperty("profile.email.mode").equals("capture")) {
      Path dir =
          Path.of(env.getRequiredProperty("profile.media.root"))
              .toAbsolutePath()
              .resolve("capture");
      Files.createDirectories(dir);
      Files.writeString(
          dir.resolve("reply-" + replyId + ".json"),
          json.writeValueAsString(
              Map.of(
                  "replyId", replyId.toString(),
                  "to", to,
                  "subject", payload.get("subject"),
                  "text", payload.get("text"))));
      return;
    }
    String endpoint = env.getRequiredProperty("profile.email.endpoint");
    if (!endpoint.equals("https://api.resend.com/emails"))
      throw new IllegalStateException("Unverified provider");
    var req =
        HttpRequest.newBuilder(URI.create(endpoint))
            .timeout(Duration.ofSeconds(10))
            .header("Authorization", "Bearer " + env.getRequiredProperty("profile.email.key"))
            .header("Idempotency-Key", "reply-" + replyId)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)))
            .build();
    var response = client.send(req, HttpResponse.BodyHandlers.discarding());
    if (response.statusCode() < 200 || response.statusCode() > 299)
      throw new IllegalStateException("Provider rejected reply");
  }

  static Map<String, Object> replyPayload(
      String from,
      String replyTo,
      String to,
      String visitorName,
      String originalMessage,
      String body) {
    String original = originalMessage == null ? "" : originalMessage;
    if (original.length() > 2000) original = original.substring(0, 2000);
    String quoted = original.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\n> ");
    String text =
        "Hi "
            + visitorName
            + ",\n\n"
            + body
            + "\n\n— Sravana S Parimi\nsravanasparimi.com\n\n> "
            + quoted;
    var p = new LinkedHashMap<String, Object>();
    p.put("from", from);
    p.put("to", List.of(to));
    if (!replyTo.isBlank()) p.put("reply_to", replyTo);
    p.put("subject", REPLY_SUBJECT);
    p.put("text", text);
    return p;
  }

  static Map<String, Object> otpPayload(String from, String to, String code) {
    String text =
        "Your verification code is "
            + code
            + ".\n\nIt is valid for 10 minutes and can be used once.\n\nIf you did not request"
            + " this, you can ignore this email.";
    String html =
        "<p>Your verification code is <strong style=\"font-size:1.25em;letter-spacing:.15em\">"
            + code
            + "</strong>.</p><p>It is valid for 10 minutes and can be used once.</p><p>If you did"
            + " not request this, you can ignore this email.</p>";
    return Map.of(
        "from", from,
        "to", List.of(to),
        "subject", "Your verification code: " + code,
        "text", text,
        "html", html);
  }
}
