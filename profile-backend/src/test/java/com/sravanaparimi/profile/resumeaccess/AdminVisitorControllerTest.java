package com.sravanaparimi.profile.resumeaccess;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import com.sravanaparimi.profile.ProfileApplication;
import com.sravanaparimi.profile.accounts.Authz;
import com.sravanaparimi.profile.audit.AuditLog;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class AdminVisitorControllerTest {
  @SuppressWarnings("resource") // stopped in @AfterAll
  static PostgreSQLContainer db =
      new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("test_visitors");

  static ConfigurableApplicationContext app;
  static HttpServer jwks;
  static RSAKey rsa;
  static String base, issuer;
  static JdbcTemplate sql;
  static VisitorRepository visitors;
  static ResumeTokenService tokens;
  static final JsonMapper JSON = JsonMapper.builder().build();

  @BeforeAll
  static void start() throws Exception {
    db.start();
    rsa = new RSAKeyGenerator(2048).keyID("test").generate();
    jwks = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    jwks.createContext(
        "/jwks",
        ex -> {
          byte[] data = new JWKSet(rsa.toPublicJWK()).toString().getBytes();
          ex.getResponseHeaders().set("Content-Type", "application/json");
          ex.sendResponseHeaders(200, data.length);
          ex.getResponseBody().write(data);
          ex.close();
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
            "logging.level.root", "WARN"));
    app =
        spring.run(
            "--server.port=0",
            "--profile.media.root=target/test-media",
            "--profile.auth.issuer=" + issuer,
            "--profile.auth.audience=test-api",
            "--profile.admin.owner-sub=owner");
    base = "http://localhost:" + app.getEnvironment().getProperty("local.server.port");
    sql = app.getBean(JdbcTemplate.class);
    visitors = app.getBean(VisitorRepository.class);
    tokens = app.getBean(ResumeTokenService.class);
    for (String sub : List.of("owner", "other-admin")) {
      assertTrue(List.of(200, 201).contains(call("POST", "/api/me", token(sub, true), "{}").statusCode()));
      sql.update(
          "UPDATE accounts SET role=? WHERE subject=?", sub.equals("owner") ? "owner" : "editor", sub);
    }
  }

  @AfterAll
  static void stop() {
    if (app != null) app.close();
    if (jwks != null) jwks.stop(0);
    db.stop();
  }

  @BeforeEach
  void clean() {
    sql.update("DELETE FROM resume_visitor");
    sql.update("DELETE FROM audit_events");
  }

  static String token(String sub, boolean mfa) throws Exception {
    var claims =
        new JWTClaimsSet.Builder()
            .issuer(issuer)
            .subject(sub)
            .audience("test-api")
            .issueTime(new Date())
            .expirationTime(Date.from(Instant.now().plusSeconds(300)))
            .claim("amr", mfa ? List.of("mfa") : List.of("pwd"))
            .build();
    var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test").build(), claims);
    jwt.sign(new RSASSASigner(rsa));
    return jwt.serialize();
  }

  static HttpResponse<String> call(String method, String path, String bearer, String body)
      throws Exception {
    var b = HttpRequest.newBuilder(URI.create(base + path));
    if (bearer != null) b.header("Authorization", "Bearer " + bearer);
    b.header("Content-Type", "application/json")
        .method(
            method,
            body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
    return HttpClient.newHttpClient().send(b.build(), HttpResponse.BodyHandlers.ofString());
  }

  static HttpResponse<String> asOwner(String method, String path) throws Exception {
    return call(method, path, token("owner", true), null);
  }

  @Test
  void ownerListsVisitorsNewestFirstWithPagingShape() throws Exception {
    for (String e : List.of("a@x.com", "b@x.com", "c@x.com")) {
      visitors.upsert(e, new byte[] {1});
      Thread.sleep(5);
    }
    var r = asOwner("GET", "/api/admin/resume-visitors?page=0&size=2");
    assertEquals(200, r.statusCode());
    assertEquals("no-store", r.headers().firstValue("Cache-Control").orElse(""));
    JsonNode body = JSON.readTree(r.body());
    assertEquals(0, body.get("page").asInt());
    assertEquals(2, body.get("size").asInt());
    assertEquals(3, body.get("total").asInt());
    assertEquals(2, body.get("items").size());
    var first = body.get("items").get(0);
    assertEquals("c@x.com", first.get("email").asString());
    for (String f : List.of("id", "email", "firstVerifiedAt", "lastVerifiedAt", "verifyCount"))
      assertNotNull(first.get(f), f);
    assertFalse(r.body().contains("ipHash") || r.body().contains("last_ip"));
    var second = JSON.readTree(asOwner("GET", "/api/admin/resume-visitors?page=1&size=2").body());
    assertEquals("a@x.com", second.get("items").get(0).get("email").asString());
  }

  @Test
  void defaultsAndCapsOnPageSize() throws Exception {
    assertEquals(25, JSON.readTree(asOwner("GET", "/api/admin/resume-visitors").body()).get("size").asInt());
    assertEquals(
        100,
        JSON.readTree(asOwner("GET", "/api/admin/resume-visitors?size=1000").body()).get("size").asInt());
    assertEquals(400, asOwner("GET", "/api/admin/resume-visitors?size=0").statusCode());
    assertEquals(400, asOwner("GET", "/api/admin/resume-visitors?page=-1").statusCode());
    assertEquals(400, asOwner("GET", "/api/admin/resume-visitors?size=abc").statusCode());
  }

  @Test
  void adminWhoIsNotTheOwnerIsForbidden() throws Exception {
    visitors.upsert("a@x.com", new byte[] {1});
    String id = visitors.page(0, 1).getFirst().id().toString();
    String other = token("other-admin", true);
    assertEquals(403, call("GET", "/api/admin/resume-visitors", other, null).statusCode());
    assertEquals(403, call("DELETE", "/api/admin/resume-visitors/" + id, other, null).statusCode());
    assertEquals(1, visitors.count());
  }

  @Test
  void ownerWithoutMfaIsForbidden() throws Exception {
    String noMfa = token("owner", false);
    assertEquals(403, call("GET", "/api/admin/resume-visitors", noMfa, null).statusCode());
    assertEquals(
        403, call("DELETE", "/api/admin/resume-visitors/" + UUID.randomUUID(), noMfa, null).statusCode());
  }

  @Test
  void otpAndMissingTokensAreUnauthorized() throws Exception {
    String otp = tokens.issue("a@x.com");
    assertEquals(401, call("GET", "/api/admin/resume-visitors", otp, null).statusCode());
    assertEquals(
        401, call("DELETE", "/api/admin/resume-visitors/" + UUID.randomUUID(), otp, null).statusCode());
    assertEquals(401, call("GET", "/api/admin/resume-visitors", null, null).statusCode());
  }

  @Test
  void deleteReturns204ThenReturns404() throws Exception {
    visitors.upsert("a@x.com", new byte[] {1});
    String id = visitors.page(0, 1).getFirst().id().toString();
    assertEquals(204, asOwner("DELETE", "/api/admin/resume-visitors/" + id).statusCode());
    assertEquals(0, visitors.count());
    assertEquals(404, asOwner("DELETE", "/api/admin/resume-visitors/" + id).statusCode());
    assertEquals(404, asOwner("DELETE", "/api/admin/resume-visitors/" + UUID.randomUUID()).statusCode());
    assertEquals(400, asOwner("DELETE", "/api/admin/resume-visitors/not-a-uuid").statusCode());
  }

  @Test
  void listAndDeleteAreAuditedWithoutEmailText() throws Exception {
    visitors.upsert("secret.person@x.com", new byte[] {1});
    String id = visitors.page(0, 1).getFirst().id().toString();
    asOwner("GET", "/api/admin/resume-visitors");
    asOwner("DELETE", "/api/admin/resume-visitors/" + id);
    var rows = sql.queryForList("SELECT action, resource FROM audit_events ORDER BY id");
    assertEquals(
        List.of("resume_visitor.list", "resume_visitor.delete"),
        rows.stream().map(r -> r.get("action")).toList());
    assertEquals(id, rows.get(1).get("resource"));
    for (var row : rows) {
      assertFalse(row.toString().contains("secret.person"), row.toString());
      assertFalse(row.toString().contains("@"), row.toString());
    }
    assertNotNull(sql.queryForObject("SELECT actor FROM audit_events LIMIT 1", UUID.class));
  }

  @Test
  void ownerSubComparisonFailsClosed() {
    assertFalse(new Authz(mock(JdbcTemplate.class), mock(AuditLog.class), new MockEnvironment()).isOwnerSub("owner"));
    assertFalse(
        new Authz(
                mock(JdbcTemplate.class),
                mock(AuditLog.class),
                new MockEnvironment().withProperty("profile.admin.owner-sub", "x"))
            .isOwnerSub("owner"));
    assertTrue(
        new Authz(
                mock(JdbcTemplate.class),
                mock(AuditLog.class),
                new MockEnvironment().withProperty("profile.admin.owner-sub", "owner"))
            .isOwnerSub("owner"));
  }
}
