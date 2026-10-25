package com.sravanaparimi.profile.content;

import static org.junit.jupiter.api.Assertions.*;

import com.sravanaparimi.profile.ProfileApplication;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.postgresql.PostgreSQLContainer;

class ContentIntegrationTest {
  @SuppressWarnings("resource") // stopped in @AfterAll
  static PostgreSQLContainer db =
      new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("test_content");

  static ConfigurableApplicationContext app;
  static String base;

  @BeforeAll
  static void start() {
    db.start();
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
            "server.port",
            "0"));
    app = spring.run("--server.port=0");
    base = "http://localhost:" + app.getEnvironment().getProperty("local.server.port");
  }

  @AfterAll
  static void stop() {
    if (app != null) app.close();
    db.stop();
  }

  static HttpResponse<String> get(String path, String tag) throws Exception {
    var request = HttpRequest.newBuilder(URI.create(base + path));
    if (tag != null) request.header("If-None-Match", tag);
    return HttpClient.newHttpClient()
        .send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
  }

  @Test
  void minimalHealthResponse() throws Exception {
    var r = get("/api/health", null);
    assertEquals(200, r.statusCode());
    assertEquals("{\"status\":\"UP\"}", r.body());
  }

  @Test
  void publishedSnapshotHasCurrentFactsAndNoDraft() throws Exception {
    var r = get("/api/site", null);
    assertEquals(200, r.statusCode());
    assertTrue(r.body().contains("Fifth Third Bank"));
    assertTrue(r.body().contains("produce specifications"));
    assertFalse(r.body().contains("draft-secret"));
  }

  @Test
  void conditionalGetPreservesRevision() throws Exception {
    var r = get("/api/site", null);
    assertEquals(200, r.statusCode());
    assertTrue(r.headers().firstValue("ETag").isPresent());
    assertEquals(304, get("/api/site", r.headers().firstValue("ETag").orElseThrow()).statusCode());
  }

  @Test
  void privateApisRequireAuthentication() throws Exception {
    assertEquals(401, get("/api/me", null).statusCode());
  }
}
