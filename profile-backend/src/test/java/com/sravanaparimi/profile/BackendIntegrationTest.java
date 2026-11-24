package com.sravanaparimi.profile;

import static org.junit.jupiter.api.Assertions.*;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

class BackendIntegrationTest {
  @SuppressWarnings("resource") // stopped in @AfterAll
  static PostgreSQLContainer db =
      new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("test_backend");

  static ConfigurableApplicationContext app;
  static HttpServer jwks;
  static RSAKey key;
  static String base, issuer;
  static JdbcTemplate sql;
  static JsonMapper json = JsonMapper.builder().build();

  @BeforeAll
  static void start() throws Exception {
    db.start();
    key = new RSAKeyGenerator(2048).keyID("test").generate();
    jwks = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    jwks.createContext(
        "/jwks",
        exchange -> {
          byte[] data = new JWKSet(key.toPublicJWK()).toString().getBytes();
          exchange.getResponseHeaders().set("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, data.length);
          exchange.getResponseBody().write(data);
          exchange.close();
        });
    jwks.start();
    issuer = "http://127.0.0.1:" + jwks.getAddress().getPort() + "/";
    var spring = new SpringApplication(ProfileApplication.class);
    spring.setDefaultProperties(
        Map.of(
            "spring.profiles.active",
            "test",
            "spring.datasource.url",
            db.getJdbcUrl(),
            "spring.datasource.username",
            db.getUsername(),
            "spring.datasource.password",
            db.getPassword(),
            "spring.data.redis.port",
            "1",
            "profile.auth.jwks",
            issuer + "jwks",
            "profile.media.root",
            "target/test-media",
            "logging.level.root",
            "WARN"));
    app =
        spring.run(
            "--server.port=0",
            "--profile.media.root=target/test-media",
            "--profile.auth.issuer=" + issuer,
            "--profile.auth.audience=test-api");
    base = "http://localhost:" + app.getEnvironment().getProperty("local.server.port");
    sql = app.getBean(JdbcTemplate.class);
  }

  @AfterAll
  static void stop() {
    if (app != null) app.close();
    if (jwks != null) jwks.stop(0);
    db.stop();
  }

  static String token(String subject, String audience, String iss, long seconds, boolean mfa)
      throws Exception {
    var claims =
        new JWTClaimsSet.Builder()
            .issuer(iss)
            .subject(subject)
            .audience(audience)
            .issueTime(new Date())
            .expirationTime(Date.from(Instant.now().plusSeconds(seconds)))
            .claim("amr", mfa ? List.of("mfa") : List.of("pwd"))
            .build();
    var jwt =
        new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test").build(), claims);
    jwt.sign(new RSASSASigner(key));
    return jwt.serialize();
  }

  static String token(String subject) throws Exception {
    return token(subject, "test-api", issuer, 300, true);
  }

  static HttpResponse<String> request(
      String method, String path, String bearer, String body, String idempotency) throws Exception {
    var b = HttpRequest.newBuilder(URI.create(base + path));
    if (bearer != null) b.header("Authorization", "Bearer " + bearer);
    if (idempotency != null) b.header("Idempotency-Key", idempotency);
    b.header("Content-Type", "application/json")
        .method(
            method,
            body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body));
    return HttpClient.newHttpClient().send(b.build(), HttpResponse.BodyHandlers.ofString());
  }

  static HttpResponse<String> call(String method, String path, String subject, String body)
      throws Exception {
    return request(method, path, subject == null ? null : token(subject), body, null);
  }

  static void admin() throws Exception {
    int status = call("POST", "/api/me", "owner", "{}").statusCode();
    assertTrue(status == 200 || status == 201);
    sql.update("UPDATE accounts SET role='owner' WHERE subject='owner'");
  }

  static void editor(String subject, boolean canPublish) throws Exception {
    int status = call("POST", "/api/me", subject, "{}").statusCode();
    assertTrue(status == 200 || status == 201);
    sql.update(
        "UPDATE accounts SET role='editor', can_publish=? WHERE subject=?", canPublish, subject);
  }

  @Test
  void forgedOrWrongAudienceOrExpiredTokensAreDenied() throws Exception {
    assertEquals(401, request("GET", "/api/me", "not-a-jwt", null, null).statusCode());
    assertEquals(
        401,
        request("GET", "/api/me", token("alice", "other", issuer, 300, true), null, null)
            .statusCode());
    assertEquals(
        401,
        request(
                "GET",
                "/api/me",
                token("alice", "test-api", "https://wrong/", 300, true),
                null,
                null)
            .statusCode());
    assertEquals(
        401,
        request("GET", "/api/me", token("alice", "test-api", issuer, -120, true), null, null)
            .statusCode());
  }

  @Test
  void accountProvisioningIsIdempotentAndOwnProfilePersists() throws Exception {
    assertEquals(
        201,
        call("POST", "/api/me", "alice", "{\"firstName\":\"Alice\",\"lastName\":\"Engineer\"}")
            .statusCode());
    assertEquals(200, call("POST", "/api/me", "alice", "{}").statusCode());
    assertEquals(200, call("GET", "/api/me", "alice", null).statusCode());
    assertEquals(
        1,
        sql.queryForObject("SELECT count(*) FROM accounts WHERE subject='alice'", Integer.class));
    String profile =
        "{\"firstName\":\"Alice\",\"lastName\":\"Engineer\",\"phone\":\"+1 212 555"
            + " 0100\",\"addressLine1\":\"1 Main Street\",\"addressLine2\":\"Apt 2\",\"city\":\"New"
            + " York\",\"region\":\"NY\",\"postalCode\":\"10001\",\"country\":\"US\"}";
    assertEquals(200, call("PUT", "/api/me", "alice", profile).statusCode());
    assertTrue(call("GET", "/api/me", "alice", null).body().contains("New York"));
    assertEquals(
        "10001",
        sql.queryForObject("SELECT postal_code FROM accounts WHERE subject='alice'", String.class));
    assertEquals(404, call("GET", "/api/me", "bob", null).statusCode());
    assertEquals(
        400,
        call("PUT", "/api/me", "alice", "{\"firstName\":\"Mallory\",\"role\":\"admin\"}")
            .statusCode());
  }

  @Test
  void readingAnUnprovisionedProfileDoesNotCreateItAndProvisionRequiresAuthentication()
      throws Exception {
    assertEquals(401, call("POST", "/api/me", null, "{}").statusCode());
    assertEquals(404, call("GET", "/api/me", "read-only", null).statusCode());
    assertEquals(
        0,
        sql.queryForObject(
            "SELECT count(*) FROM accounts WHERE subject='read-only'", Integer.class));
  }

  @Test
  void concurrentProvisioningHasOneIdentity() throws Exception {
    try (var pool = java.util.concurrent.Executors.newFixedThreadPool(6)) {
      var tasks = new ArrayList<java.util.concurrent.Future<Integer>>();
      for (int i = 0; i < 12; i++)
        tasks.add(pool.submit(() -> call("POST", "/api/me", "concurrent", "{}").statusCode()));
      int created = 0;
      for (var t : tasks) {
        int status = t.get();
        assertTrue(status == 200 || status == 201);
        if (status == 201) created++;
      }
      assertEquals(1, created);
    }
    assertEquals(
        1,
        sql.queryForObject(
            "SELECT count(*) FROM accounts WHERE subject='concurrent'", Integer.class));
  }

  @Test
  void viewerCannotEditAndRevokedAdminCannotWrite() throws Exception {
    assertEquals(403, call("POST", "/api/admin/drafts", "visitor", "{}").statusCode());
    admin();
    sql.update("UPDATE accounts SET role=NULL WHERE subject='owner'");
    assertEquals(403, call("GET", "/api/admin/drafts", "owner", null).statusCode());
  }

  @Test
  void editorEditsDraftsButCannotSeePeopleOrPublishWithoutFlag() throws Exception {
    editor("ed", false);
    assertEquals(200, call("GET", "/api/admin/drafts", "ed", null).statusCode());
    var denied = call("GET", "/api/admin/resume-visitors", "ed", null);
    assertEquals(403, denied.statusCode());
    assertEquals("forbidden", json.readTree(denied.body()).get("code").asText());
    var d = json.readTree(call("POST", "/api/admin/drafts", "ed", "{}").body());
    assertEquals(
        403,
        call("POST", "/api/admin/drafts/" + d.get("id").asLong() + "/publish", "ed", "{\"version\":1}")
            .statusCode());
    sql.update("UPDATE accounts SET can_publish=true WHERE subject='ed'");
    assertNotEquals(
        403,
        call("POST", "/api/admin/drafts/" + d.get("id").asLong() + "/publish", "ed", "{\"version\":1}")
            .statusCode());
    // The publish above queued a job; clear it so the shared-DB publication tests start clean.
    sql.update("DELETE FROM publication_jobs WHERE status='pending'");
  }

  @Test
  void noMfaReturnsMachineCode() throws Exception {
    admin();
    var r =
        request("GET", "/api/admin/drafts", token("owner", "test-api", issuer, 300, false), null, null);
    assertEquals(403, r.statusCode());
    assertEquals("mfa_required", json.readTree(r.body()).get("code").asText());
  }

  @Test
  void draftsArePrivateAndStaleEditsConflict() throws Exception {
    admin();
    var created = call("POST", "/api/admin/drafts", "owner", "{}");
    assertEquals(201, created.statusCode());
    var draft = json.readTree(created.body());
    long id = draft.get("id").asLong();
    var content = draft.get("content").deepCopy();
    ((tools.jackson.databind.node.ObjectNode) content.get("profile"))
        .put("headline", "draft-secret");
    String edit = json.writeValueAsString(Map.of("version", 1, "content", content));
    assertEquals(200, call("PUT", "/api/admin/drafts/" + id, "owner", edit).statusCode());
    assertEquals(409, call("PUT", "/api/admin/drafts/" + id, "owner", edit).statusCode());
    assertFalse(call("GET", "/api/site", null, null).body().contains("draft-secret"));
    assertTrue(sql.queryForObject("SELECT count(*) FROM audit_events", Integer.class) > 0);
    assertEquals(
        403,
        request(
                "GET",
                "/api/admin/drafts",
                token("owner", "test-api", issuer, 300, false),
                null,
                null)
            .statusCode());
  }

  @Test
  void contactAcceptanceIsDurableAndIdempotent() throws Exception {
    String id = UUID.randomUUID().toString();
    String body =
        "{\"name\":\"Review\",\"email\":\"review@example.test\",\"message\":\"Please discuss this"
            + " portfolio project.\",\"website\":\"\"}";
    var first = request("POST", "/api/contact", null, body, id);
    assertEquals(202, first.statusCode());
    var second = request("POST", "/api/contact", null, body, id);
    assertEquals(202, second.statusCode());
    assertEquals(first.body(), second.body());
    assertEquals(
        409,
        request("POST", "/api/contact", null, body.replace("Review", "Different"), id)
            .statusCode());
    assertEquals(
        1,
        sql.queryForObject(
            "SELECT count(*) FROM inquiries WHERE idempotency_key=?", Integer.class, id));
    assertEquals(
        1,
        sql.queryForObject(
            "SELECT count(*) FROM outbox WHERE inquiry_id=(SELECT id FROM inquiries WHERE"
                + " idempotency_key=?)",
            Integer.class,
            id));
  }

  @Test
  void contactRejectsBotAndInvalidEmail() throws Exception {
    assertEquals(
        400,
        request(
                "POST",
                "/api/contact",
                null,
                "{\"name\":\"Bot\",\"email\":\"invalid\",\"message\":\"test\",\"website\":\"spam\"}",
                UUID.randomUUID().toString())
            .statusCode());
  }

  @Test
  void resumeIsPrivateAndMissingFileFailsClosed() throws Exception {
    assertEquals(401, call("GET", "/api/resume", null, null).statusCode());
    var r = call("GET", "/api/resume", "resume-reader", null);
    assertEquals(503, r.statusCode());
    assertTrue(r.headers().firstValue("Cache-Control").orElse("").contains("no-store"));
  }

  @Test
  void resumeServesPdfToAuthenticatedUserOnly() throws Exception {
    var file = java.nio.file.Path.of("target/test-media/private/resume.pdf");
    java.nio.file.Files.createDirectories(file.getParent());
    java.nio.file.Files.write(file, "%PDF-1.4 test".getBytes());
    try {
      assertEquals(401, call("GET", "/api/resume", null, null).statusCode());
      var r = call("GET", "/api/resume", "resume-reader", null);
      assertEquals(200, r.statusCode());
      assertTrue(r.body().startsWith("%PDF"));
      assertEquals("application/pdf", r.headers().firstValue("Content-Type").orElse(""));
      assertTrue(r.headers().firstValue("Cache-Control").orElse("").contains("no-store"));
      var anyAuthed = call("GET", "/api/resume", "someone-else", null);
      assertEquals(200, anyAuthed.statusCode());
    } finally {
      java.nio.file.Files.deleteIfExists(file);
    }
  }

  @Test
  void resumeSymlinkIsNotServed() throws Exception {
    var file = java.nio.file.Path.of("target/test-media/private/resume.pdf");
    var target = java.nio.file.Path.of("target/test-media/elsewhere.pdf");
    java.nio.file.Files.createDirectories(file.getParent());
    java.nio.file.Files.write(target, "%PDF".getBytes());
    java.nio.file.Files.deleteIfExists(file);
    try {
      java.nio.file.Files.createSymbolicLink(file.toAbsolutePath(), target.toAbsolutePath());
      assertEquals(503, call("GET", "/api/resume", "resume-reader", null).statusCode());
    } finally {
      java.nio.file.Files.deleteIfExists(file);
      java.nio.file.Files.deleteIfExists(target);
    }
  }

  @Test
  void adminAcceptsNamespacedMfaClaimAndRejectsNoMfa() throws Exception {
    admin();
    String body = "{}";
    assertEquals(
        403,
        request(
                "POST",
                "/api/admin/drafts",
                token("owner", "test-api", issuer, 300, false),
                body,
                null)
            .statusCode());
    var claims =
        new JWTClaimsSet.Builder()
            .issuer(issuer)
            .subject("owner")
            .audience("test-api")
            .issueTime(new Date())
            .expirationTime(Date.from(Instant.now().plusSeconds(300)))
            .claim("amr", List.of("pwd"))
            .claim("https://sravanasparimi.com/amr", List.of("mfa"))
            .build();
    var jwt =
        new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test").build(), claims);
    jwt.sign(new RSASSASigner(key));
    int status = request("POST", "/api/admin/drafts", jwt.serialize(), body, null).statusCode();
    assertTrue(status >= 200 && status < 300);
  }

  @Test
  void publishingIsRejectedWhenDisabled() throws Exception {
    admin();
    var d = json.readTree(call("POST", "/api/admin/drafts", "owner", "{}").body());
    long id = d.get("id").asLong();
    var env = (org.springframework.core.env.ConfigurableEnvironment) app.getEnvironment();
    env.getPropertySources()
        .addFirst(
            new org.springframework.core.env.MapPropertySource(
                "off", Map.of("profile.publishing.enabled", "false")));
    try {
      assertEquals(
          503,
          call("POST", "/api/admin/drafts/" + id + "/publish", "owner", "{\"version\":1}")
              .statusCode());
    } finally {
      env.getPropertySources().remove("off");
    }
  }

  @Test
  void deletionRemovesPersonalDataAndCannotReprovisionDeletedIdentity() throws Exception {
    assertEquals(201, call("POST", "/api/me", "delete-me", "{}").statusCode());
    assertEquals(204, call("DELETE", "/api/me", "delete-me", null).statusCode());
    assertEquals(410, call("GET", "/api/me", "delete-me", null).statusCode());
    assertEquals(410, call("POST", "/api/me", "delete-me", "{}").statusCode());
  }

  @Test
  void publicationFailureKeepsCurrentSnapshotAndSuccessfulRenderActivatesAtomically()
      throws Exception {
    admin();
    var d = json.readTree(call("POST", "/api/admin/drafts", "owner", "{}").body());
    long id = d.get("id").asLong();
    var accepted = call("POST", "/api/admin/drafts/" + id + "/publish", "owner", "{\"version\":1}");
    assertEquals(202, accepted.statusCode());
    long old = json.readTree(call("GET", "/api/site", null, null).body()).get("revision").asLong();
    var worker = app.getBean(com.sravanaparimi.profile.publishing.PublicationWorker.class);
    worker.runOnce();
    // Test context has no renderer: failure must preserve active content.
    assertEquals(
        old, json.readTree(call("GET", "/api/site", null, null).body()).get("revision").asLong());
    assertEquals(
        "failed",
        sql.queryForObject(
            "SELECT status FROM publication_jobs WHERE revision_id=(SELECT target_revision FROM"
                + " site_state)",
            String.class));
  }

  @Test
  void outboxCaptureIsIdempotentAndExpiredLeaseIsReclaimed() throws Exception {
    String id = UUID.randomUUID().toString();
    request(
        "POST",
        "/api/contact",
        null,
        "{\"name\":\"Worker\",\"email\":\"worker@example.test\",\"message\":\"Synthetic worker test"
            + " message\"}",
        id);
    var worker = app.getBean(com.sravanaparimi.profile.jobs.NotificationWorker.class);
    worker.runOnce();
    assertEquals(
        0, sql.queryForObject("SELECT count(*) FROM outbox WHERE status='pending'", Integer.class));
    assertTrue(
        sql.queryForObject("SELECT count(*) FROM outbox WHERE status='sent'", Integer.class) > 0);
    sql.update(
        "UPDATE outbox SET status='processing',lease_until=now()-interval '1 minute',lease_id=?"
            + " WHERE inquiry_id=(SELECT id FROM inquiries WHERE idempotency_key=?)",
        UUID.randomUUID(),
        id);
    worker.runOnce();
    assertEquals(
        "sent",
        sql.queryForObject(
            "SELECT status FROM outbox WHERE inquiry_id=(SELECT id FROM inquiries WHERE"
                + " idempotency_key=?)",
            String.class,
            id));
  }

  static HttpResponse<byte[]> upload(String path, String mime, byte[] bytes) throws Exception {
    String boundary = "profile-test-boundary";
    var out = new java.io.ByteArrayOutputStream();
    out.write(
        ("--"
                + boundary
                + "\r\n"
                + "Content-Disposition: form-data; name=\"file\"; filename=\"../../unsafe.svg\"\r\n"
                + "Content-Type: "
                + mime
                + "\r\n\r\n")
            .getBytes());
    out.write(bytes);
    out.write(("\r\n--" + boundary + "--\r\n").getBytes());
    var req =
        HttpRequest.newBuilder(URI.create(base + path))
            .header("Authorization", "Bearer " + token("owner"))
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(out.toByteArray()))
            .build();
    return HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofByteArray());
  }

  @Test
  void mediaRejectsActiveContentAndUsesGeneratedNames() throws Exception {
    admin();
    assertEquals(
        400,
        upload(
                "/api/admin/media",
                "image/svg+xml",
                "<svg><script>attack()</script></svg>".getBytes())
            .statusCode());
    assertEquals(
        400, upload("/api/admin/media", "image/png", "not-an-image".getBytes()).statusCode());
    var image = new java.awt.image.BufferedImage(2, 2, java.awt.image.BufferedImage.TYPE_INT_RGB);
    var bytes = new java.io.ByteArrayOutputStream();
    javax.imageio.ImageIO.write(image, "png", bytes);
    var result = upload("/api/admin/media", "image/png", bytes.toByteArray());
    assertEquals(201, result.statusCode());
    var media = json.readTree(result.body());
    var publicFile = call("GET", media.get("url").asString(), null, null);
    assertEquals(200, publicFile.statusCode());
    assertFalse(media.get("url").asString().contains("unsafe"));
    assertFalse(media.get("url").asString().contains(".."));
  }

  @Test
  void publicSnapshotSurvivesRedisFailure() throws Exception {
    assertEquals(200, call("GET", "/api/site", null, null).statusCode());
  }

  @Test
  void accountAndDraftResponsesCannotBeCached() throws Exception {
    assertEquals(201, call("POST", "/api/me", "private-cache", "{}").statusCode());
    assertTrue(
        call("GET", "/api/me", "private-cache", null)
            .headers()
            .firstValue("Cache-Control")
            .orElse("")
            .contains("no-store"));
    admin();
    assertTrue(
        call("GET", "/api/admin/drafts", "owner", null)
            .headers()
            .firstValue("Cache-Control")
            .orElse("")
            .contains("no-store"));
  }
}
