package com.sravanaparimi.profile.inquiries;

import static org.junit.jupiter.api.Assertions.*;

import com.sravanaparimi.profile.ProfileApplication;
import com.sravanaparimi.profile.platform.EmailGateway;
import com.sravanaparimi.profile.resumeaccess.TurnstileVerifier;
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class ContactAlertIntegrationTest {
  @SuppressWarnings("resource") // stopped in @AfterAll
  static PostgreSQLContainer db =
      new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("test_contact_alert");

  static final JsonMapper JSON = JsonMapper.builder().build();
  static final AtomicBoolean failEmail = new AtomicBoolean();
  static final List<String> actions = Collections.synchronizedList(new ArrayList<>());
  static ConfigurableApplicationContext app;
  static String base;
  static JdbcTemplate sql;
  static Path capture;

  /** Real gateway (capture mode) that can be told to fail like a provider outage. */
  static class FlakyGateway extends EmailGateway {
    FlakyGateway(Environment env, JsonMapper json) {
      super(env, json);
    }

    @Override
    public void send(UUID eventId, Map<String, Object> inquiry) throws Exception {
      if (failEmail.get()) throw new IllegalStateException("provider down");
      super.send(eventId, inquiry);
    }
  }

  @BeforeAll
  static void start() throws Exception {
    db.start();
    Path media = Files.createTempDirectory("contact-media");
    capture = media.resolve("capture");
    var spring = new SpringApplication(ProfileApplication.class);
    spring.addInitializers(
        ctx -> {
          var g = (GenericApplicationContext) ctx;
          g.registerBean(
              "fakeTurnstile",
              TurnstileVerifier.class,
              () ->
                  new TurnstileVerifier() {
                    public boolean verify(String token, String ip) {
                      return !"bad".equals(token);
                    }

                    @Override
                    public boolean verify(String token, String ip, String action) {
                      actions.add(action);
                      return verify(token, ip);
                    }
                  },
              bd -> bd.setPrimary(true));
          g.registerBean(
              "flakyGateway",
              EmailGateway.class,
              () -> new FlakyGateway(g.getEnvironment(), JSON),
              bd -> bd.setPrimary(true));
        });
    spring.setDefaultProperties(
        Map.of(
            "spring.profiles.active", "test",
            "spring.datasource.url", db.getJdbcUrl(),
            "spring.datasource.username", db.getUsername(),
            "spring.datasource.password", db.getPassword(),
            "spring.data.redis.port", "1",
            "logging.level.root", "WARN"));
    app =
        spring.run(
            "--server.port=0",
            "--profile.media.root=" + media,
            "--profile.auth.issuer=http://127.0.0.1:1/",
            "--profile.auth.jwks=http://127.0.0.1:1/jwks",
            "--profile.auth.audience=test-api");
    base = "http://localhost:" + app.getEnvironment().getProperty("local.server.port");
    sql = app.getBean(JdbcTemplate.class);
  }

  @AfterAll
  static void stop() {
    if (app != null) app.close();
    db.stop();
  }

  @BeforeEach
  void reset() {
    failEmail.set(false);
    sql.update("DELETE FROM contact_limits");
  }

  static String body(String name, String token) {
    var m = new LinkedHashMap<String, Object>();
    m.put("name", name);
    m.put("email", "visitor@example.test");
    m.put("message", "Please call me about the platform role.");
    m.put("website", "");
    if (token != null) m.put("turnstileToken", token);
    return JSON.writeValueAsString(m);
  }

  static HttpResponse<String> post(String body, String key, String... headers) throws Exception {
    var b =
        HttpRequest.newBuilder(URI.create(base + "/api/contact"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body));
    if (key != null) b.header("Idempotency-Key", key);
    for (int i = 0; i < headers.length; i += 2) b.header(headers[i], headers[i + 1]);
    return HttpClient.newHttpClient().send(b.build(), HttpResponse.BodyHandlers.ofString());
  }

  static String key() {
    return UUID.randomUUID().toString();
  }

  static String outboxStatus(String key) {
    return sql.queryForObject(
        "SELECT status FROM outbox WHERE inquiry_id=(SELECT id FROM inquiries WHERE"
            + " idempotency_key=?)",
        String.class,
        key);
  }

  static UUID outboxId(String key) {
    return sql.queryForObject(
        "SELECT id FROM outbox WHERE inquiry_id=(SELECT id FROM inquiries WHERE"
            + " idempotency_key=?)",
        UUID.class,
        key);
  }

  static String code(HttpResponse<String> r) throws Exception {
    JsonNode n = JSON.readTree(r.body());
    return n.path("code").asString("");
  }

  @Test
  void validTokenStoresInquiryAndSendsOwnerAlertBeforeResponding() throws Exception {
    String k = key();
    var r = post(body("Alert Visitor", "ok"), k);
    assertEquals(202, r.statusCode());
    assertEquals("no-store", r.headers().firstValue("Cache-Control").orElse(""));
    assertEquals("sent", outboxStatus(k));
    var file = capture.resolve(outboxId(k) + ".json");
    assertTrue(Files.exists(file), "owner alert must already be captured");
    assertEquals("Alert Visitor", JSON.readTree(Files.readString(file)).get("name").asString());
    assertTrue(actions.contains("contact"));
  }

  @Test
  void missingOrBlankTokenIsRejectedWithCodeAndStoresNothing() throws Exception {
    int before = sql.queryForObject("SELECT count(*) FROM inquiries", Integer.class);
    for (String token : new String[] {null, "", "   "}) {
      var r = post(body("No Token", token), key());
      assertEquals(400, r.statusCode());
      assertEquals("captcha_required", code(r));
    }
    assertEquals(before, sql.queryForObject("SELECT count(*) FROM inquiries", Integer.class));
  }

  @Test
  void invalidTokenIsForbiddenWithCodeAndStoresNothing() throws Exception {
    int before = sql.queryForObject("SELECT count(*) FROM inquiries", Integer.class);
    var r = post(body("Bad Token", "bad"), key());
    assertEquals(403, r.statusCode());
    assertEquals("captcha_failed", code(r));
    assertEquals(before, sql.queryForObject("SELECT count(*) FROM inquiries", Integer.class));
  }

  @Test
  void alertFailureStillSucceedsAndLeavesOutboxPending() throws Exception {
    failEmail.set(true);
    String k = key();
    var r = post(body("Outage Visitor", "ok"), k);
    assertEquals(202, r.statusCode());
    assertEquals("pending", outboxStatus(k));
    assertEquals(
        "notification_failed",
        sql.queryForObject(
            "SELECT last_error FROM outbox WHERE id=?", String.class, outboxId(k)));
    assertFalse(Files.exists(capture.resolve(outboxId(k) + ".json")));
  }

  @Test
  void idempotentReplayDoesNotSendASecondAlert() throws Exception {
    String k = key();
    String b = body("Replay Visitor", "ok");
    var first = post(b, k);
    var second = post(b, k);
    assertEquals(202, first.statusCode());
    assertEquals(202, second.statusCode());
    assertEquals(first.body(), second.body());
    assertEquals("sent", outboxStatus(k));
    assertEquals(
        1,
        sql.queryForObject(
            "SELECT count(*) FROM outbox WHERE inquiry_id=(SELECT id FROM inquiries WHERE"
                + " idempotency_key=?)",
            Integer.class,
            k));
  }

  @Test
  void replayWithinBackoffDoesNotRetryTheAlert() throws Exception {
    failEmail.set(true);
    String k = key();
    String b = body("Retry Visitor", "ok");
    assertEquals(202, post(b, k).statusCode());
    assertEquals("pending", outboxStatus(k));
    failEmail.set(false);
    // Backoff not elapsed: replay must not hammer the provider.
    assertEquals(202, post(b, k).statusCode());
    assertEquals("pending", outboxStatus(k));
  }

  @Test
  void rateLimitIsPerClientIpAndReturnsCode() throws Exception {
    // Distinct hops via X-Forwarded-For; limit is 5 per hour per address.
    for (int i = 0; i < 5; i++)
      assertEquals(
          202,
          post(body("Spam " + i, "ok"), key(), "X-Forwarded-For", "198.51.100.7").statusCode());
    var limited = post(body("Spam 6", "ok"), key(), "X-Forwarded-For", "198.51.100.7");
    assertEquals(429, limited.statusCode());
    assertEquals("rate_limited", code(limited));
    assertNotNull(limited.headers().firstValue("Retry-After").orElse(null));
    // A different client is unaffected.
    assertEquals(
        202, post(body("Other", "ok"), key(), "X-Forwarded-For", "198.51.100.8").statusCode());
  }

  @Test
  void honeypotAndBadIdempotencyKeyAreStillRejected() throws Exception {
    var spam =
        JSON.writeValueAsString(
            Map.of(
                "name", "Bot",
                "email", "bot@example.test",
                "message", "Buy my product right now please",
                "website", "http://spam.example",
                "turnstileToken", "ok"));
    assertEquals(400, post(spam, key()).statusCode());
    assertEquals(400, post(body("No Key", "ok"), "short").statusCode());
  }
}
