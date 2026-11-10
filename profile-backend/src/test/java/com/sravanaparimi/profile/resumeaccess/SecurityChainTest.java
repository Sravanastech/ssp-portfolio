package com.sravanaparimi.profile.resumeaccess;

import static org.junit.jupiter.api.Assertions.*;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import com.sravanaparimi.profile.ProfileApplication;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.net.http.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.postgresql.PostgreSQLContainer;

class SecurityChainTest {
  @SuppressWarnings("resource") // stopped in @AfterAll
  static PostgreSQLContainer db =
      new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("test_chain");

  static ConfigurableApplicationContext app;
  static HttpServer jwks;
  static RSAKey rsa;
  static String base, issuer;
  static ResumeTokenService tokens;
  static OtpCrypto crypto;

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
    Path media = Files.createTempDirectory("chain-media");
    Files.createDirectories(media.resolve("private"));
    Files.write(media.resolve("private/resume.pdf"), "%PDF-1.4 test".getBytes());
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
            "--profile.media.root=" + media,
            "--profile.auth.issuer=" + issuer,
            "--profile.auth.audience=test-api");
    base = "http://localhost:" + app.getEnvironment().getProperty("local.server.port");
    tokens = app.getBean(ResumeTokenService.class);
    crypto = app.getBean(OtpCrypto.class);
  }

  @AfterAll
  static void stop() {
    if (app != null) app.close();
    if (jwks != null) jwks.stop(0);
    db.stop();
  }

  static String auth0Token(String iss, String aud, long seconds) throws Exception {
    var claims =
        new JWTClaimsSet.Builder()
            .issuer(iss)
            .subject("someone")
            .audience(aud)
            .issueTime(new Date())
            .expirationTime(Date.from(Instant.now().plusSeconds(seconds)))
            .claim("amr", List.of("mfa"))
            .build();
    var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test").build(), claims);
    jwt.sign(new RSASSASigner(rsa));
    return jwt.serialize();
  }

  static String hs256(byte[] key, String iss, String aud) throws Exception {
    var claims =
        new JWTClaimsSet.Builder()
            .issuer(iss)
            .subject("a@x.com")
            .audience(aud)
            .issueTime(new Date())
            .expirationTime(Date.from(Instant.now().plusSeconds(600)))
            .build();
    var jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
    jwt.sign(new MACSigner(key));
    return jwt.serialize();
  }

  static HttpResponse<String> call(String method, String path, String bearer) throws Exception {
    var b = HttpRequest.newBuilder(URI.create(base + path));
    if (bearer != null) b.header("Authorization", "Bearer " + bearer);
    b.header("Content-Type", "application/json")
        .method(method, HttpRequest.BodyPublishers.ofString(method.equals("POST") ? "{}" : ""));
    return HttpClient.newHttpClient().send(b.build(), HttpResponse.BodyHandlers.ofString());
  }

  static void assertDenied(HttpResponse<String> r, String what) {
    assertTrue(
        List.of(401, 403, 404, 405).contains(r.statusCode()), what + " -> " + r.statusCode());
  }

  @Test
  void otpTokenOpensTheResumeAndAuth0JwtStillDoes() throws Exception {
    var otp = call("GET", "/api/resume", tokens.issue("a@x.com"));
    assertEquals(200, otp.statusCode());
    assertEquals("no-store", otp.headers().firstValue("Cache-Control").orElse(""));
    assertEquals(200, call("GET", "/api/resume", auth0Token(issuer, "test-api", 300)).statusCode());
  }

  @Test
  void missingOrMalformedBearerIs401() throws Exception {
    assertEquals(401, call("GET", "/api/resume", null).statusCode());
    assertEquals(401, call("GET", "/api/resume", "garbage").statusCode());
    assertEquals(401, call("GET", "/api/resume", "a.b.c").statusCode());
  }

  @Test
  void expiredTamperedForgedAndWrongAudienceOtpTokensAre401() throws Exception {
    var past = new ResumeTokenService(crypto, Clock.fixed(Instant.now().minusSeconds(7200), ZoneOffset.UTC));
    assertEquals(401, call("GET", "/api/resume", past.issue("a@x.com")).statusCode());

    String good = tokens.issue("a@x.com");
    String[] p = good.split("\\.");
    String tampered = p[0] + "." + p[1] + "." + (p[2].charAt(0) == 'A' ? "B" : "A") + p[2].substring(1);
    assertEquals(401, call("GET", "/api/resume", tampered).statusCode());

    var none =
        new PlainJWT(
                new JWTClaimsSet.Builder()
                    .issuer("profile-otp")
                    .audience("resume")
                    .subject("a@x.com")
                    .expirationTime(Date.from(Instant.now().plusSeconds(600)))
                    .build())
            .serialize();
    assertEquals(401, call("GET", "/api/resume", none).statusCode());

    byte[] wrongKey = OtpCrypto.of("another-secret-0123456789-abcdefghijk", false).tokenKey();
    assertEquals(401, call("GET", "/api/resume", hs256(wrongKey, "profile-otp", "resume")).statusCode());
    assertEquals(401, call("GET", "/api/resume", hs256(crypto.tokenKey(), "profile-otp", "other")).statusCode());
    assertEquals(401, call("GET", "/api/resume", hs256(crypto.codeKey(), "profile-otp", "resume")).statusCode());
  }

  @Test
  void issuerConfusionBetweenAlgorithmsIsRejected() throws Exception {
    // RSA-signed token claiming the OTP issuer must not be accepted by the HS256 decoder.
    assertEquals(401, call("GET", "/api/resume", auth0Token("profile-otp", "resume", 300)).statusCode());
    // HS256 token claiming the Auth0 issuer must not be accepted by the RS256 decoder.
    assertEquals(401, call("GET", "/api/resume", hs256(crypto.tokenKey(), issuer, "test-api")).statusCode());
  }

  @Test
  void otpTokenIsRejectedEverywhereElse() throws Exception {
    String t = tokens.issue("a@x.com");
    assertEquals(401, call("GET", "/api/me", t).statusCode());
    assertEquals(401, call("POST", "/api/me", t).statusCode());
    assertEquals(401, call("GET", "/api/admin/drafts", t).statusCode());
    assertEquals(401, call("GET", "/api/admin/resume-visitors", t).statusCode());
    assertEquals(401, call("DELETE", "/api/admin/resume-visitors/" + UUID.randomUUID(), t).statusCode());
    assertEquals(401, call("GET", "/api/inbox", t).statusCode());
    assertNotEquals(200, call("GET", "/api/resume.json", t).statusCode());
    assertDenied(call("GET", "/api/resume.json", t), "/api/resume.json");
  }

  @Test
  void pathVariantsOfTheResumeDoNotServeTheDocument() throws Exception {
    String t = tokens.issue("a@x.com");
    for (String path :
        new String[] {"/api/resume/", "/api/resume/x", "/api/resume/otp", "/api/Resume", "/api/resume%2f"}) {
      var r = call("GET", path, t);
      assertNotEquals(200, r.statusCode(), path);
    }
    assertNotEquals(200, call("GET", "/api/resume;jsessionid=1", t).statusCode());
    assertTrue(call("POST", "/api/resume", t).statusCode() >= 400);
  }

  @Test
  void staleBearerOnOtpEndpointsDoesNotBlockTheRequest() throws Exception {
    var r = call("POST", "/api/resume/otp/verify", "stale.or.garbage");
    assertEquals(400, r.statusCode()); // reaches the controller, rejected as invalid_request
    assertTrue(r.body().contains("invalid_request"));
  }

  @Test
  void healthStaysPublicAndOtherApisStayAuth0Only() throws Exception {
    assertEquals(200, call("GET", "/api/health", null).statusCode());
    assertEquals(401, call("GET", "/api/me", null).statusCode());
    assertEquals(401, call("GET", "/api/resume", null).statusCode());
  }
}
