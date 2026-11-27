package com.sravanaparimi.profile.inquiries;

import static org.junit.jupiter.api.Assertions.*;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import com.sravanaparimi.profile.ProfileApplication;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.*;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

class InquiryReplyIntegrationTest {
  @SuppressWarnings("resource") // stopped in @AfterAll
  static PostgreSQLContainer db =
      new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("test_reply");

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
            "spring.profiles.active", "test",
            "spring.datasource.url", db.getJdbcUrl(),
            "spring.datasource.username", db.getUsername(),
            "spring.datasource.password", db.getPassword(),
            "spring.data.redis.port", "1",
            "profile.auth.jwks", issuer + "jwks",
            "profile.media.root", "target/test-media",
            "logging.level.root", "WARN"));
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

  @BeforeEach
  void clean() {
    sql.update("DELETE FROM inquiry_replies");
    sql.update("DELETE FROM outbox");
    sql.update("DELETE FROM inquiries");
    sql.update("DELETE FROM audit_events");
    sql.update("UPDATE accounts SET role=NULL, can_publish=false WHERE subject <> 'owner'");
  }

  static String token(String subject) throws Exception {
    var claims =
        new JWTClaimsSet.Builder()
            .issuer(issuer)
            .subject(subject)
            .audience("test-api")
            .issueTime(new Date())
            .expirationTime(Date.from(Instant.now().plusSeconds(300)))
            .claim("amr", List.of("mfa"))
            .build();
    var jwt =
        new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test").build(), claims);
    jwt.sign(new RSASSASigner(key));
    return jwt.serialize();
  }

  static HttpResponse<String> call(String method, String path, String subject, String body)
      throws Exception {
    var b = HttpRequest.newBuilder(URI.create(base + path));
    b.header("Authorization", "Bearer " + token(subject)).header("Content-Type", "application/json");
    b.method(
        method,
        body == null
            ? HttpRequest.BodyPublishers.noBody()
            : HttpRequest.BodyPublishers.ofString(body));
    return HttpClient.newHttpClient().send(b.build(), HttpResponse.BodyHandlers.ofString());
  }

  static void provision(String subject, String role, boolean canPublish) throws Exception {
    int s = call("POST", "/api/me", subject, "{\"firstName\":\"" + subject + "\"}").statusCode();
    assertTrue(s == 200 || s == 201);
    sql.update(
        "UPDATE accounts SET role=?, can_publish=? WHERE subject=?", role, canPublish, subject);
  }

  static UUID inquiry(String email, boolean archived) {
    UUID id = UUID.randomUUID();
    sql.update(
        "INSERT INTO inquiries(id,idempotency_key,payload_hash,name,email,message,archived)"
            + " VALUES (?,?,'h','Visitor',?,'Hello there',?)",
        id,
        id.toString(),
        email,
        archived);
    sql.update("INSERT INTO outbox(id,inquiry_id,status) VALUES (?,?,'sent')", UUID.randomUUID(), id);
    return id;
  }

  static String path(UUID id) {
    return "/api/admin/inquiries/" + id + "/replies";
  }

  @Test
  void ownerReplyHappyPath() throws Exception {
    provision("owner", "owner", false);
    UUID id = inquiry("visitor@example.com", false);
    var r = call("POST", path(id), "owner", "{\"body\":\"  Thanks for writing  \"}");
    assertEquals(201, r.statusCode());
    var node = json.readTree(r.body());
    assertEquals("sent", node.get("status").asString());
    UUID replyId = UUID.fromString(node.get("id").asString());
    assertTrue(node.get("createdAt").isString());
    assertNotNull(
        sql.queryForObject("SELECT replied_at FROM inquiries WHERE id=?", Object.class, id));
    assertEquals(
        "sent", sql.queryForObject("SELECT status FROM inquiry_replies WHERE id=?", String.class, replyId));
    assertEquals(
        "Thanks for writing",
        sql.queryForObject("SELECT body FROM inquiry_replies WHERE id=?", String.class, replyId));

    var cap =
        json.readTree(
            Files.readString(Path.of("target/test-media/capture/reply-" + replyId + ".json")));
    assertEquals("visitor@example.com", cap.get("to").asString());
    assertTrue(cap.get("text").asString().contains("> Hello there"));
    assertFalse(cap.has("reply_to"));

    String details =
        sql.queryForObject(
            "SELECT details::text FROM audit_events WHERE action='inquiry.reply'", String.class);
    assertTrue(details.contains(replyId.toString()));
    assertFalse(details.contains("example.com"));
    assertFalse(details.contains("Thanks"));

    var list = json.readTree(call("GET", path(id), "owner", null).body());
    assertEquals(1, list.size());
    for (String f : List.of("id", "authorName", "body", "status", "createdAt"))
      assertTrue(list.get(0).has(f), f);
    assertEquals("owner", list.get(0).get("authorName").asString());

    var inbox = json.readTree(call("GET", "/api/admin/inquiries", "owner", null).body());
    assertEquals(1, inbox.get(0).get("reply_count").asInt());
    assertTrue(inbox.get(0).has("replied_at"));
  }

  @Test
  void editorNeedsCanPublish() throws Exception {
    provision("owner", "owner", false);
    provision("ed", "editor", false);
    UUID id = inquiry("v@example.com", false);
    assertEquals(403, call("POST", path(id), "ed", "{\"body\":\"hi\"}").statusCode());
    assertEquals(200, call("GET", path(id), "ed", null).statusCode()); // manage still allowed
    sql.update("UPDATE accounts SET can_publish=true WHERE subject='ed'");
    assertEquals(201, call("POST", path(id), "ed", "{\"body\":\"hi\"}").statusCode());
  }

  @Test
  void noEmailArchivedAndUnknownAreRejected() throws Exception {
    provision("owner", "owner", false);
    UUID noEmail = inquiry(null, false);
    var r = call("POST", path(noEmail), "owner", "{\"body\":\"hi\"}");
    assertEquals(422, r.statusCode());
    assertEquals("no_email", json.readTree(r.body()).get("code").asString());
    UUID blank = inquiry("  ", false);
    assertEquals(422, call("POST", path(blank), "owner", "{\"body\":\"hi\"}").statusCode());
    UUID archived = inquiry("v@example.com", true);
    assertEquals(404, call("POST", path(archived), "owner", "{\"body\":\"hi\"}").statusCode());
    assertEquals(
        404, call("POST", path(UUID.randomUUID()), "owner", "{\"body\":\"hi\"}").statusCode());
  }

  @Test
  void bodyIsValidated() throws Exception {
    provision("owner", "owner", false);
    UUID id = inquiry("v@example.com", false);
    assertEquals(400, call("POST", path(id), "owner", "{\"body\":\"   \"}").statusCode());
    assertEquals(400, call("POST", path(id), "owner", "{}").statusCode());
    assertEquals(
        400, call("POST", path(id), "owner", "{\"body\":\"" + "a".repeat(5001) + "\"}").statusCode());
    assertEquals(
        201, call("POST", path(id), "owner", "{\"body\":\"" + "a".repeat(5000) + "\"}").statusCode());
  }

  @Test
  void twentyFirstReplyInAnHourIsRateLimited() throws Exception {
    provision("owner", "owner", false);
    UUID id = inquiry("v@example.com", false);
    for (int i = 0; i < 20; i++)
      assertEquals(201, call("POST", path(id), "owner", "{\"body\":\"r" + i + "\"}").statusCode());
    var r = call("POST", path(id), "owner", "{\"body\":\"one more\"}");
    assertEquals(429, r.statusCode());
    assertEquals("reply_rate_limited", json.readTree(r.body()).get("code").asString());
  }

  @Test
  void sendFailureIsRecordedAndReturns502() throws Exception {
    provision("owner", "owner", false);
    UUID id = inquiry("bad address@example.com", false); // fails the recipient check in the gateway
    var r = call("POST", path(id), "owner", "{\"body\":\"secret body\"}");
    assertEquals(502, r.statusCode());
    assertEquals("email_failed", json.readTree(r.body()).get("code").asString());
    assertEquals("failed", sql.queryForObject("SELECT status FROM inquiry_replies", String.class));
    assertEquals(
        "IllegalArgumentException", sql.queryForObject("SELECT error FROM inquiry_replies", String.class));
    assertNull(sql.queryForObject("SELECT replied_at FROM inquiries WHERE id=?", Object.class, id));
  }

  @Test
  void summaryFieldsAreGatedByPermission() throws Exception {
    provision("owner", "owner", false);
    provision("ed", "editor", false);
    inquiry("v@example.com", false);
    UUID replied = inquiry("w@example.com", false);
    sql.update("UPDATE inquiries SET replied_at=now() WHERE id=?", replied);
    inquiry("x@example.com", true);
    sql.update("DELETE FROM resume_visitor");
    sql.update("INSERT INTO resume_visitor(id,email) VALUES (?,'r@example.com')", UUID.randomUUID());
    sql.update("DELETE FROM content_revision WHERE state='draft'");
    sql.update(
        "INSERT INTO content_revision(state,content) VALUES ('draft','{}'::jsonb)");
    sql.update(
        "INSERT INTO audit_events(action,resource,outcome) VALUES ('access.denied','admin','denied')");

    var o = call("GET", "/api/admin/summary", "owner", null);
    assertEquals(200, o.statusCode());
    assertTrue(o.headers().firstValue("Cache-Control").orElse("").contains("no-store"));
    var on = json.readTree(o.body());
    assertEquals(1, on.get("openInquiries").asInt());
    assertTrue(on.get("draftPending").asBoolean());
    assertEquals(1, on.get("newResumeVisitors7d").asInt());
    assertTrue(on.get("deniedEvents7d").asInt() >= 1);

    var e = json.readTree(call("GET", "/api/admin/summary", "ed", null).body());
    assertEquals(1, e.get("openInquiries").asInt());
    assertTrue(e.has("draftPending"));
    assertFalse(e.has("newResumeVisitors7d"));
    assertFalse(e.has("deniedEvents7d"));
  }

  @Test
  void summaryRequiresAnAdminRole() throws Exception {
    call("POST", "/api/me", "plain", "{}");
    assertEquals(403, call("GET", "/api/admin/summary", "plain", null).statusCode());
  }
}
