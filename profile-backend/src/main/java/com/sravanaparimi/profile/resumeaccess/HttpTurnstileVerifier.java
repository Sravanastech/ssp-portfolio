package com.sravanaparimi.profile.resumeaccess;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Server-side Cloudflare Turnstile verification. Fails closed; never logs tokens. */
@Component
public class HttpTurnstileVerifier implements TurnstileVerifier {
  static final URI SITEVERIFY = URI.create("https://challenges.cloudflare.com/turnstile/v0/siteverify");
  static final String ACTION = "resume_otp";
  private static final int MAX_TOKEN_LENGTH = 2048;

  private final boolean enabled;
  private final String secret;
  private final Set<String> allowedHostnames;
  private final boolean requireAction;
  private final URI endpoint;
  private final Duration timeout;
  private final JsonMapper json;
  private final HttpClient client;

  @Autowired
  public HttpTurnstileVerifier(Environment env, JsonMapper json) {
    this(
        env.getProperty("profile.resume-otp.turnstile.enabled", Boolean.class, true),
        env.getProperty("profile.resume-otp.turnstile.secret", ""),
        splitHostnames(env.getProperty("profile.resume-otp.turnstile.allowed-hostnames", "")),
        env.getProperty("profile.resume-otp.turnstile.require-action", Boolean.class, true),
        SITEVERIFY,
        Duration.ofSeconds(3),
        json);
  }

  HttpTurnstileVerifier(
      boolean enabled,
      String secret,
      List<String> allowedHostnames,
      boolean requireAction,
      URI endpoint,
      Duration timeout,
      JsonMapper json) {
    this.enabled = enabled;
    this.secret = secret;
    this.allowedHostnames = Set.copyOf(allowedHostnames);
    this.requireAction = requireAction;
    this.endpoint = endpoint;
    this.timeout = timeout;
    this.json = json;
    this.client =
        HttpClient.newBuilder()
            .connectTimeout(timeout)
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
  }

  private static List<String> splitHostnames(String csv) {
    return Arrays.stream(csv.split(","))
        .map(s -> s.trim())
        .filter(s -> !s.isEmpty())
        .map(s -> s.toLowerCase(Locale.ROOT))
        .toList();
  }

  @Override
  public boolean verify(String token, String remoteIp) {
    if (!enabled) return true;
    if (token == null || token.isBlank() || token.length() > MAX_TOKEN_LENGTH) return false;
    try {
      var form = new StringBuilder();
      form.append("secret=").append(enc(secret)).append("&response=").append(enc(token));
      if (remoteIp != null && !remoteIp.isBlank()) form.append("&remoteip=").append(enc(remoteIp));
      var req =
          HttpRequest.newBuilder(endpoint)
              .timeout(timeout)
              .header("Content-Type", "application/x-www-form-urlencoded")
              .POST(HttpRequest.BodyPublishers.ofString(form.toString()))
              .build();
      var res = client.send(req, HttpResponse.BodyHandlers.ofString());
      if (res.statusCode() != 200) return false;
      JsonNode node = json.readTree(res.body());
      if (!node.path("success").asBoolean(false)) return false;
      String host = node.path("hostname").asString("").toLowerCase(Locale.ROOT);
      if (!allowedHostnames.contains(host)) return false;
      JsonNode action = node.get("action");
      if (action == null || action.isNull()) return !requireAction;
      return ACTION.equals(action.asString(""));
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      return false;
    } catch (Exception ex) {
      return false;
    }
  }

  private static String enc(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
