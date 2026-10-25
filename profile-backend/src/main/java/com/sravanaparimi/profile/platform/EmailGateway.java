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
}
