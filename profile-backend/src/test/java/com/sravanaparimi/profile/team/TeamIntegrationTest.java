package com.sravanaparimi.profile.team;

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
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

class TeamIntegrationTest {
  @SuppressWarnings("resource") // stopped in @AfterAll
  static PostgreSQLContainer db =
      new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("test_team");

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
    sql.update("DELETE FROM invites");
    sql.update("UPDATE accounts SET role=NULL, can_publish=false WHERE subject <> 'owner'");
  }

  static String token(String subject, String email) throws Exception {
    var claims =
        new JWTClaimsSet.Builder()
            .issuer(issuer)
            .subject(subject)
            .audience("test-api")
            .issueTime(new Date())
            .expirationTime(Date.from(Instant.now().plusSeconds(300)))
            .claim("amr", List.of("mfa"));
    if (email != null) {
      claims.claim("https://sravanasparimi.com/email", email);
      claims.claim("https://sravanasparimi.com/email_verified", true);
    }
    var jwt =
        new SignedJWT(
            new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test").build(), claims.build());
    jwt.sign(new RSASSASigner(key));
    return jwt.serialize();
  }

  static HttpResponse<String> send(String method, String path, String bearer, String body)
      throws Exception {
    var b = HttpRequest.newBuilder(URI.create(base + path));
    if (bearer != null) b.header("Authorization", "Bearer " + bearer);
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
    return send(method, path, token(subject, null), body);
  }

  static HttpResponse<String> get(String subject, String path) throws Exception {
    return call("GET", path, subject, null);
  }

  static HttpResponse<String> post(String subject, String path, String body) throws Exception {
    return call("POST", path, subject, body);
  }

  static HttpResponse<String> postAs(String subject, String email, String path, String body)
      throws Exception {
    return send("POST", path, token(subject, email), body);
  }

  static void owner() throws Exception {
    int status = call("POST", "/api/me", "owner", "{}").statusCode();
    assertTrue(status == 200 || status == 201);
    sql.update("UPDATE accounts SET role='owner' WHERE subject='owner'");
  }

  @Test
  void inviteLifecycle() throws Exception {
    owner();
    var created =
        post("owner", "/api/admin/team/invites", "{\"email\":\"Ed@Example.com\",\"canPublish\":false}");
    assertEquals(201, created.statusCode());
    String tokenValue = json.readTree(created.body()).get("token").asText();
    assertTrue(json.readTree(created.body()).get("expiresAt").isString(), "expiresAt is ISO text");
    assertFalse(
        sql.queryForObject(
                "SELECT count(*) FROM audit_events WHERE details::text ILIKE '%example.com%'",
                Integer.class)
            > 0);

    // wrong email cannot accept
    assertEquals(
        403,
        postAs(
                "mallory",
                "mallory@example.com",
                "/api/admin/invites/accept",
                "{\"token\":\"" + tokenValue + "\"}")
            .statusCode());
    // right email accepts once
    var ok =
        postAs(
            "ed",
            "ed@example.com",
            "/api/admin/invites/accept",
            "{\"token\":\"" + tokenValue + "\"}");
    assertEquals(200, ok.statusCode());
    assertEquals("editor", json.readTree(ok.body()).get("role").asText());
    assertEquals(
        "editor", sql.queryForObject("SELECT role FROM accounts WHERE subject='ed'", String.class));
    // replay
    var again =
        postAs(
            "ed",
            "ed@example.com",
            "/api/admin/invites/accept",
            "{\"token\":\"" + tokenValue + "\"}");
    assertEquals(410, again.statusCode());
    assertEquals("invite_unavailable", json.readTree(again.body()).get("code").asText());

    var me = json.readTree(get("ed", "/api/admin/me").body());
    assertEquals("editor", me.get("role").asText());
    assertFalse(me.get("canPublish").asBoolean());
    assertTrue(me.get("permissions").isArray());
    assertEquals(403, get("ed", "/api/admin/team").statusCode());
    assertEquals(403, get("ed", "/api/admin/audit").statusCode());

    var team = json.readTree(get("owner", "/api/admin/team").body());
    assertTrue(team.get("members").size() >= 2);
    var first = team.get("members").get(0);
    for (String f :
        List.of("accountId", "firstName", "lastName", "email", "role", "canPublish", "since"))
      assertTrue(first.has(f), f);
    assertTrue(first.get("since").isString(), "since is ISO text");
  }

  @Test
  void ownerCannotBeRemovedAndLimitsHold() throws Exception {
    owner();
    UUID ownerId = sql.queryForObject("SELECT id FROM accounts WHERE subject='owner'", UUID.class);
    assertEquals(404, call("DELETE", "/api/admin/team/" + ownerId, "owner", null).statusCode());
    for (int i = 0; i < 5; i++)
      assertEquals(
          201,
          post("owner", "/api/admin/team/invites", "{\"email\":\"u" + i + "@x.com\"}")
              .statusCode());
    assertEquals(
        409, post("owner", "/api/admin/team/invites", "{\"email\":\"u9@x.com\"}").statusCode());
  }

  @Test
  void expiredInviteIsUnavailable() throws Exception {
    owner();
    String t =
        json.readTree(post("owner", "/api/admin/team/invites", "{\"email\":\"late@x.com\"}").body())
            .get("token")
            .asText();
    sql.update("UPDATE invites SET expires_at = now() - interval '1 minute'");
    assertEquals(
        410,
        postAs("late", "late@x.com", "/api/admin/invites/accept", "{\"token\":\"" + t + "\"}")
            .statusCode());
  }

  @Test
  void auditPagesWithCursor() throws Exception {
    owner();
    for (int i = 0; i < 3; i++) post("owner", "/api/admin/drafts", "{}");
    var page1 = json.readTree(get("owner", "/api/admin/audit?limit=2").body());
    assertEquals(2, page1.get("items").size());
    var item = page1.get("items").get(0);
    for (String f :
        List.of("id", "at", "actorId", "actorName", "action", "resource", "outcome", "details"))
      assertTrue(item.has(f), f);
    assertTrue(item.get("at").isString(), "at is ISO text");
    long next = page1.get("next").asLong();
    var page2 = json.readTree(get("owner", "/api/admin/audit?limit=2&before=" + next).body());
    assertTrue(page2.get("items").get(0).get("id").asLong() < next);
  }

  @Test
  void existingMemberCannotBurnAnInvite() throws Exception {
    owner();
    String t =
        json.readTree(post("owner", "/api/admin/team/invites", "{\"email\":\"mem@x.com\"}").body())
            .get("token")
            .asText();
    postAs(
        "mem", "mem@x.com", "/api/admin/invites/accept", "{\"token\":\"" + t + "\"}"); // editor
    sql.update("UPDATE accounts SET role='editor' WHERE subject='mem'");
    sql.update("DELETE FROM invites");
    String t2 =
        json.readTree(
                post("owner", "/api/admin/team/invites", "{\"email\":\"other@x.com\"}").body())
            .get("token")
            .asText();
    assertEquals(
        403,
        postAs("mem", "other@x.com", "/api/admin/invites/accept", "{\"token\":\"" + t2 + "\"}")
            .statusCode());
    assertNull(
        sql.queryForObject(
            "SELECT accepted_at FROM invites WHERE email='other@x.com'", java.sql.Timestamp.class));
  }

  @Test
  void patchAndRemoveEditorAndRevokeInvite() throws Exception {
    owner();
    String t =
        json.readTree(post("owner", "/api/admin/team/invites", "{\"email\":\"p@x.com\"}").body())
            .get("token")
            .asText();
    assertEquals(
        200,
        postAs("pe", "p@x.com", "/api/admin/invites/accept", "{\"token\":\"" + t + "\"}")
            .statusCode());
    UUID id = sql.queryForObject("SELECT id FROM accounts WHERE subject='pe'", UUID.class);
    assertEquals(
        204,
        call("PATCH", "/api/admin/team/" + id, "owner", "{\"canPublish\":true}").statusCode());
    assertTrue(
        sql.queryForObject("SELECT can_publish FROM accounts WHERE subject='pe'", Boolean.class));
    assertEquals(204, call("DELETE", "/api/admin/team/" + id, "owner", null).statusCode());
    assertNull(sql.queryForObject("SELECT role FROM accounts WHERE subject='pe'", String.class));

    var inv =
        json.readTree(post("owner", "/api/admin/team/invites", "{\"email\":\"r@x.com\"}").body());
    assertEquals(
        204,
        call("DELETE", "/api/admin/team/invites/" + inv.get("id").asText(), "owner", null)
            .statusCode());
  }
}
