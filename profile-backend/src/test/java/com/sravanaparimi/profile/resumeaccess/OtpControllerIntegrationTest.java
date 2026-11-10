package com.sravanaparimi.profile.resumeaccess;

import static org.junit.jupiter.api.Assertions.*;

import com.sravanaparimi.profile.ProfileApplication;
import java.net.*;
import java.net.http.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class OtpControllerIntegrationTest {
  @SuppressWarnings("resource") // stopped in @AfterAll
  static PostgreSQLContainer db =
      new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("test_otp_http");

  static ConfigurableApplicationContext app;
  static String base;
  static JdbcTemplate sql;
  static OtpService service;
  static final JsonMapper JSON = JsonMapper.builder().build();
  static final AtomicInteger captchaCalls = new AtomicInteger();
  static Path capture;

  @BeforeAll
  static void start() throws Exception {
    db.start();
    Path media = Files.createTempDirectory("otp-media");
    capture = media.resolve("capture");
    var spring = new SpringApplication(ProfileApplication.class);
    spring.addInitializers(
        ctx ->
            ((org.springframework.context.support.GenericApplicationContext) ctx)
                .registerBean(
                    "fakeTurnstile",
                    TurnstileVerifier.class,
                    () ->
                        (token, ip) -> {
                          captchaCalls.incrementAndGet();
                          return !"bad".equals(token);
                        },
                    bd -> bd.setPrimary(true)));
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
            "--server.forward-headers-strategy=framework",
            "--profile.media.root=" + media,
            "--profile.auth.issuer=http://127.0.0.1:1/",
            "--profile.auth.jwks=http://127.0.0.1:1/jwks",
            "--profile.auth.audience=test-api");
    base = "http://localhost:" + app.getEnvironment().getProperty("local.server.port");
    sql = app.getBean(JdbcTemplate.class);
    service = app.getBean(OtpService.class);
  }

  @AfterAll
  static void stop() {
    if (app != null) app.close();
    db.stop();
  }

  @BeforeEach
  void clean() {
    sql.update("DELETE FROM resume_otp_challenge");
    sql.update("DELETE FROM resume_visitor");
    captchaCalls.set(0);
  }

  static HttpResponse<String> post(String path, String contentType, String body, String... headers)
      throws Exception {
    var b = HttpRequest.newBuilder(URI.create(base + path)).POST(HttpRequest.BodyPublishers.ofString(body));
    if (contentType != null) b.header("Content-Type", contentType);
    for (int i = 0; i < headers.length; i += 2) b.header(headers[i], headers[i + 1]);
    return HttpClient.newHttpClient().send(b.build(), HttpResponse.BodyHandlers.ofString());
  }

  static HttpResponse<String> requestOtp(String email, String token, String... headers)
      throws Exception {
    return post(
        "/api/resume/otp/request",
        "application/json",
        JSON.writeValueAsString(Map.of("email", email, "turnstileToken", token)),
        headers);
  }

  static HttpResponse<String> verify(String challengeId, String code, String... headers)
      throws Exception {
    return post(
        "/api/resume/otp/verify",
        "application/json",
        JSON.writeValueAsString(Map.of("challengeId", challengeId, "code", code)),
        headers);
  }

  static String codeFor(String challengeId) throws Exception {
    return JSON.readTree(Files.readString(capture.resolve("otp-" + challengeId + ".json")))
        .get("code")
        .asString();
  }

  static JsonNode body(HttpResponse<String> r) throws Exception {
    return JSON.readTree(r.body());
  }

  static int challenges() {
    return sql.queryForObject("SELECT count(*) FROM resume_otp_challenge", Integer.class);
  }

  @Test
  void happyPathOverHttpReadsCodeFromCaptureFile() throws Exception {
    var r = requestOtp("Visitor@Example.com", "ok");
    assertEquals(202, r.statusCode());
    assertEquals("no-store", r.headers().firstValue("Cache-Control").orElse(""));
    var node = body(r);
    assertEquals(45, node.get("resendAfterSeconds").asInt());
    assertEquals(600, node.get("expiresInSeconds").asInt());
    String id = node.get("challengeId").asString();
    var v = verify(id, codeFor(id));
    assertEquals(200, v.statusCode());
    assertEquals(1800, body(v).get("expiresInSeconds").asInt());
    assertEquals("no-store", v.headers().firstValue("Cache-Control").orElse(""));
    assertFalse(body(v).get("accessToken").asString().isBlank());
    assertEquals(
        "visitor@example.com",
        sql.queryForObject("SELECT email FROM resume_visitor", String.class));
  }

  @Test
  void wrongCodeReportsAttemptsRemainingWithCode() throws Exception {
    var id = body(requestOtp("a@x.com", "ok")).get("challengeId").asString();
    String good = codeFor(id);
    var r = verify(id, good.equals("000000") ? "000001" : "000000");
    assertEquals(400, r.statusCode());
    assertEquals("invalid_code", body(r).get("code").asString());
    assertEquals(4, body(r).get("attemptsRemaining").asInt());
    assertEquals("no-store", r.headers().firstValue("Cache-Control").orElse(""));
  }

  @Test
  void unknownAndKnownEmailsGetTheSameResponseShape() throws Exception {
    var first = body(requestOtp("known@x.com", "ok"));
    var second = body(requestOtp("never-seen@x.com", "ok"));
    assertEquals(
        new TreeSet<>(first.propertyNames()), new TreeSet<>(second.propertyNames()));
    assertEquals(first.get("resendAfterSeconds"), second.get("resendAfterSeconds"));
    assertEquals(first.get("expiresInSeconds"), second.get("expiresInSeconds"));
  }

  @Test
  void captchaFailureReturns403WithoutDatabaseWriteOrEmail() throws Exception {
    long before;
    try (var s = Files.exists(capture) ? Files.list(capture) : java.util.stream.Stream.<Path>empty()) {
      before = s.count();
    }
    var r = requestOtp("a@x.com", "bad");
    assertEquals(403, r.statusCode());
    assertEquals("captcha_failed", body(r).get("code").asString());
    assertEquals(0, challenges());
    long after;
    try (var s = Files.exists(capture) ? Files.list(capture) : java.util.stream.Stream.<Path>empty()) {
      after = s.count();
    }
    assertEquals(before, after);
  }

  @Test
  void nonJsonContentTypeIsRejectedBeforeAnyWork() throws Exception {
    for (String ct : new String[] {"text/plain", "application/x-www-form-urlencoded", null}) {
      var r = post("/api/resume/otp/request", ct, "{\"email\":\"a@x.com\",\"turnstileToken\":\"ok\"}");
      assertTrue(r.statusCode() == 415 || r.statusCode() == 400, "" + r.statusCode());
      assertEquals("invalid_request", body(r).get("code").asString());
    }
    assertEquals(0, challenges());
    assertEquals(0, captchaCalls.get());
  }

  @Test
  void malformedBodiesAreInvalidRequest() throws Exception {
    for (String bad :
        new String[] {
          "{", "{\"email\":\"a@x.com\"}", "{\"email\":\"nope\",\"turnstileToken\":\"ok\"}",
          "{\"email\":\"a@x.com\",\"turnstileToken\":\"ok\",\"extra\":1}"
        }) {
      var r = post("/api/resume/otp/request", "application/json", bad);
      assertEquals(400, r.statusCode(), bad);
      assertEquals("invalid_request", body(r).get("code").asString());
    }
    var v = post("/api/resume/otp/verify", "application/json", "{\"challengeId\":\"x\",\"code\":\"12\"}");
    assertEquals(400, v.statusCode());
    assertEquals("invalid_request", body(v).get("code").asString());
  }

  @Test
  void rateLimitedResponseCarriesRetryAfterHeaderAndBody() throws Exception {
    assertEquals(202, requestOtp("a@x.com", "ok").statusCode());
    var r = requestOtp("a@x.com", "ok");
    assertEquals(429, r.statusCode());
    assertEquals("rate_limited", body(r).get("code").asString());
    assertTrue(Integer.parseInt(r.headers().firstValue("Retry-After").orElseThrow()) > 0);
    assertTrue(body(r).get("retryAfterSeconds").asInt() > 0);
    assertEquals("no-store", r.headers().firstValue("Cache-Control").orElse(""));
  }

  @Test
  void spoofedLeftmostForwardedForDoesNotChangeTheStoredIpBucket() throws Exception {
    requestOtp("a@x.com", "ok", "X-Forwarded-For", "6.6.6.6, 203.0.113.7");
    requestOtp("b@x.com", "ok", "X-Forwarded-For", "7.7.7.7, 203.0.113.7");
    var hashes = sql.queryForList("SELECT ip_hash FROM resume_otp_challenge", byte[].class);
    assertEquals(2, hashes.size());
    assertArrayEquals(service.ipHash("203.0.113.7"), hashes.get(0));
    assertArrayEquals(hashes.get(0), hashes.get(1));
    assertFalse(Arrays.equals(service.ipHash("6.6.6.6"), hashes.get(0)));
  }

  @Test
  void tenSendsPerSpoofedLeftmostStillHitTheSameIpLimit() throws Exception {
    int accepted = 0, limited = 0;
    for (int i = 0; i < 12; i++) {
      var r = requestOtp("u" + i + "@x.com", "ok", "X-Forwarded-For", "9.9.9." + i + ", 203.0.113.9");
      if (r.statusCode() == 202) accepted++;
      else if (r.statusCode() == 429) limited++;
    }
    assertEquals(10, accepted);
    assertEquals(2, limited);
  }

  @Test
  void parallelCorrectVerifiesOverHttpYieldExactlyOne200() throws Exception {
    var id = body(requestOtp("a@x.com", "ok")).get("challengeId").asString();
    String code = codeFor(id);
    var ok = new AtomicInteger();
    var bad = new AtomicInteger();
    try (var pool = Executors.newFixedThreadPool(6)) {
      var start = new CountDownLatch(1);
      var futures = new ArrayList<Future<?>>();
      for (int i = 0; i < 6; i++)
        futures.add(
            pool.submit(
                () -> {
                  start.await();
                  var r = verify(id, code);
                  if (r.statusCode() == 200) ok.incrementAndGet();
                  else if (r.statusCode() == 400) bad.incrementAndGet();
                  return null;
                }));
      start.countDown();
      for (var f : futures) f.get(30, TimeUnit.SECONDS);
    }
    assertEquals(1, ok.get());
    assertEquals(5, bad.get());
  }

  @Test
  void lockedResponseCarriesRetryAfter() throws Exception {
    String[] fwd = {"X-Forwarded-For", "9.9.9.9, 198.51.100.200"};
    for (int c = 0; c < 4; c++) {
      requestOtp("lock" + c + "@x.com", "ok", fwd);
    }
    sql.update("UPDATE resume_otp_challenge SET attempts=5");
    var id = body(requestOtp("lockfresh@x.com", "ok", fwd)).get("challengeId").asString();
    var r = verify(id, codeFor(id), fwd);
    assertEquals(429, r.statusCode());
    assertEquals("locked", body(r).get("code").asString());
    assertTrue(r.headers().firstValue("Retry-After").isPresent());
  }

  @Test
  void otpEndpointsOnlyAcceptPost() throws Exception {
    var r =
        HttpClient.newHttpClient()
            .send(
                HttpRequest.newBuilder(URI.create(base + "/api/resume/otp/request")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    assertTrue(List.of(401, 403, 405).contains(r.statusCode()), "" + r.statusCode());
  }
}
