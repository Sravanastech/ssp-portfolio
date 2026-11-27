package com.sravanaparimi.profile.studio;

import static org.junit.jupiter.api.Assertions.*;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import com.sravanaparimi.profile.ProfileApplication;
import com.sun.net.httpserver.HttpServer;
import java.io.InputStream;
import java.net.*;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class StudioIntegrationTest {
  @SuppressWarnings("resource") // stopped in @AfterAll
  static PostgreSQLContainer db =
      new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("test_studio");

  static ConfigurableApplicationContext app;
  static HttpServer jwks;
  static RSAKey key;
  static String base, issuer;
  static JdbcTemplate sql;
  static final JsonMapper json = JsonMapper.builder().build();

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
            "profile.github.callback-secret", "integration-callback-secret-0123456789",
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
  void reset() throws Exception {
    sql.update("DELETE FROM site_release");
    sql.update("DELETE FROM content_block");
    sql.execute((ConnectionCallback<Integer>) c -> ContentBlockImporter.importPublished(c));
    sql.update("DELETE FROM audit_events");
    sql.update("UPDATE accounts SET role=NULL, can_publish=false WHERE subject <> 'owner'");
    provision("owner", "owner", false);
    provision("ed", "editor", false);
    provision("pub", "editor", true);
  }

  static String token(String subject) throws Exception {
    var claims =
        new JWTClaimsSet.Builder()
            .issuer(issuer)
            .subject(subject)
            .audience("test-api")
            .issueTime(new Date())
            .expirationTime(Date.from(Instant.now().plusSeconds(300)))
            .claim("amr", List.of("mfa"));
    var jwt =
        new SignedJWT(
            new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test").build(), claims.build());
    jwt.sign(new RSASSASigner(key));
    return jwt.serialize();
  }

  static HttpResponse<String> call(String method, String path, String subject, String body)
      throws Exception {
    var b = HttpRequest.newBuilder(URI.create(base + path));
    if (subject != null) b.header("Authorization", "Bearer " + token(subject));
    b.header("Content-Type", "application/json")
        .method(
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

  static JsonNode ok(HttpResponse<String> r, int status) {
    assertEquals(status, r.statusCode(), r.body());
    return json.readTree(r.body());
  }

  static JsonNode studio() throws Exception {
    return ok(call("GET", "/api/admin/studio", "ed", null), 200);
  }

  static JsonNode block(String type, String slug) throws Exception {
    for (JsonNode b : studio().get("blocks"))
      if (b.get("type").asString().equals(type) && b.get("slug").asString().equals(slug)) return b;
    throw new AssertionError("no block " + type + "/" + slug);
  }

  static JsonNode save(String subject, String changes, int status) throws Exception {
    return ok(call("POST", "/api/admin/studio/save", subject, "{\"changes\":" + changes + "}"), status);
  }

  /** Changes one text field of the published experience-1 and returns the save request item. */
  static String editExperience(JsonNode b, String description) {
    ObjectNode data = ((ObjectNode) b.get("published")).deepCopy();
    data.put("description", description);
    return "{\"id\":\"" + b.get("id").asString() + "\",\"version\":" + b.get("version").asLong()
        + ",\"draft\":" + data + "}";
  }

  static JsonNode seed() throws Exception {
    try (InputStream in = StudioIntegrationTest.class.getResourceAsStream("/seed/portfolio.json")) {
      return json.readTree(in);
    }
  }

  static JsonNode site() throws Exception {
    return json.readTree(call("GET", "/api/site", null, null).body()).get("content");
  }

  static JsonNode lastAuditDetails(String action) {
    return json.readTree(
        sql.queryForObject(
            "SELECT details::text FROM audit_events WHERE action=? ORDER BY id DESC LIMIT 1",
            String.class,
            action));
  }

  // ---- read side -------------------------------------------------------------------------

  @Test
  void overviewListsBlocksSchemasPendingCountAndHonoursEtag() throws Exception {
    var r = call("GET", "/api/admin/studio", "ed", null);
    var body = ok(r, 200);
    assertEquals(47, body.get("blocks").size());
    assertEquals(8, body.get("schemas").size());
    assertEquals(0, body.get("pendingCount").asInt());
    var first = body.get("blocks").get(0);
    for (String f : List.of("id", "type", "slug", "position", "published", "version", "pending"))
      assertTrue(first.has(f), f);
    assertTrue(first.get("draft").isNull());
    var tag = r.headers().firstValue("ETag").orElseThrow();
    var again = HttpRequest.newBuilder(URI.create(base + "/api/admin/studio"))
        .header("Authorization", "Bearer " + token("ed")).header("If-None-Match", tag).GET().build();
    assertEquals(304, HttpClient.newHttpClient().send(again, HttpResponse.BodyHandlers.ofString()).statusCode());
  }

  @Test
  void endpointsRequireAnAdminRole() throws Exception {
    assertEquals(401, call("GET", "/api/admin/studio", null, null).statusCode());
    call("POST", "/api/me", "plain", "{}");
    assertEquals(403, call("GET", "/api/admin/studio", "plain", null).statusCode());
    assertEquals(403, call("POST", "/api/admin/releases", "plain", "{}").statusCode());
  }

  @Test
  void draftPreviewEqualsTheBundledContentWhenNothingIsPending() throws Exception {
    var preview = ok(call("GET", "/api/admin/studio/preview", "ed", null), 200).get("content");
    assertEquals(seed(), preview);
  }

  // ---- save ------------------------------------------------------------------------------

  @Test
  void saveKeepsEditsAsDraftAndLeavesTheLiveSiteUntouched() throws Exception {
    var b = block("experience", "experience-1");
    var out = save("ed", "[" + editExperience(b, "Rewrote the platform.") + "]", 200);
    var saved = out.get("blocks").get(0);
    assertEquals("Rewrote the platform.", saved.get("draft").get("description").asString());
    assertEquals(b.get("published"), saved.get("published"));
    assertEquals(b.get("version").asLong() + 1, saved.get("version").asLong());
    assertTrue(saved.get("pending").asBoolean());
    assertEquals(seed(), site());
    assertEquals(1, studio().get("pendingCount").asInt());
    var details = lastAuditDetails("studio.save");
    assertEquals("experience", details.at("/blocks/0/type").asString());
    assertEquals(b.get("id").asString(), details.at("/blocks/0/id").asString());
    assertFalse(details.toString().contains("Rewrote"), "audit holds ids and types only");
    var summary = ok(call("GET", "/api/admin/summary", "ed", null), 200);
    assertTrue(summary.get("draftPending").asBoolean());
  }

  @Test
  void savingContentIdenticalToPublishedLeavesNoDraft() throws Exception {
    var b = block("experience", "experience-1");
    var same = editExperience(b, b.at("/published/description").asString());
    var saved = save("ed", "[" + same + "]", 200).get("blocks").get(0);
    assertTrue(saved.get("draft").isNull());
    assertFalse(saved.get("pending").asBoolean());
    assertFalse(ok(call("GET", "/api/admin/summary", "ed", null), 200).get("draftPending").asBoolean());
  }

  @Test
  void staleVersionRejectsTheWholeBatchAndNamesTheConflictingBlocks() throws Exception {
    var a = block("experience", "experience-1");
    var c = block("experience", "experience-2");
    save("ed", "[" + editExperience(a, "first edit") + "]", 200);
    var stale = editExperience(a, "second edit from an old tab");
    var fresh = editExperience(c, "innocent edit");
    var r = call("POST", "/api/admin/studio/save", "ed", "{\"changes\":[" + stale + "," + fresh + "]}");
    var body = ok(r, 409);
    assertEquals("block_conflict", body.get("code").asString());
    assertEquals(List.of(a.get("id").asString()), List.of(body.get("ids").get(0).asString()));
    assertEquals(1, body.get("ids").size());
    assertTrue(block("experience", "experience-2").get("draft").isNull(), "batch is all-or-nothing");
  }

  @Test
  void invalidContentIsReportedPerChangeAndNothingIsSaved() throws Exception {
    var good = block("experience", "experience-2");
    var bad = block("experience", "experience-1");
    ObjectNode tooLong = ((ObjectNode) bad.get("published")).deepCopy();
    tooLong.put("title", "x".repeat(200));
    var badChange = "{\"id\":\"" + bad.get("id").asString() + "\",\"version\":" + bad.get("version").asLong() + ",\"draft\":" + tooLong + "}";
    var body = save("ed", "[" + editExperience(good, "fine") + "," + badChange + "]", 422);
    assertEquals("validation_failed", body.get("code").asString());
    var err = body.get("errors").get(0);
    assertEquals(1, err.get("index").asInt());
    assertEquals(bad.get("id").asString(), err.get("id").asString());
    assertTrue(err.get("path").asString().contains("title"));
    assertEquals(0, studio().get("pendingCount").asInt());
  }

  @Test
  void unsafeUrlAndUnknownFieldsAreRejected() throws Exception {
    var nav = block("navigation_item", "home");
    var evil = "{\"id\":\"" + nav.get("id").asString() + "\",\"version\":" + nav.get("version").asLong()
        + ",\"draft\":{\"href\":\"javascript:alert(1)\",\"label\":\"Home\"}}";
    assertEquals("validation_failed", save("ed", "[" + evil + "]", 422).get("code").asString());
    var unknown = call("POST", "/api/admin/studio/save", "ed", "{\"changes\":[{\"type\":\"experience\",\"bogus\":1}]}");
    assertEquals(400, unknown.statusCode());
  }

  @Test
  void newItemsGetSlugIdAndTrailingPositionAndNeverPublishedRemoveOnDiscard() throws Exception {
    String data = "{\"year\":\"2026\",\"title\":\"Staff Engineer\",\"company\":\"Acme\",\"description\":\"Led things\"}";
    var created = save("ed", "[{\"type\":\"experience\",\"draft\":" + data + "},"
        + "{\"type\":\"experience\",\"draft\":" + data + "}]", 200).get("blocks");
    var first = created.get(0).get("slug").asString().equals("staff-engineer") ? created.get(0) : created.get(1);
    var second = first == created.get(0) ? created.get(1) : created.get(0);
    assertEquals("staff-engineer-2", second.get("slug").asString());
    assertEquals("staff-engineer", first.at("/draft/id").asString());
    assertEquals("experiences", first.get("collection").asString());
    assertTrue(first.get("published").isNull());
    assertEquals(Set.of(6, 7), Set.of(first.get("position").asInt(), second.get("position").asInt()));
    var preview = ok(call("GET", "/api/admin/studio/preview", "ed", null), 200).get("content");
    assertEquals(8, preview.get("experiences").size());
    assertEquals(6, site().get("experiences").size());

    var gone = ok(call("POST", "/api/admin/studio/discard", "ed",
        "{\"ids\":[\"" + first.get("id").asString() + "\"]}"), 200);
    assertEquals(first.get("id").asString(), gone.get("removed").get(0).asString());
    assertEquals(0, sql.queryForObject("SELECT count(*) FROM content_block WHERE slug='staff-engineer'", Integer.class));
  }

  @Test
  void deletingPublishedItemIsPendingUntilPublishedAndDiscardBringsItBack() throws Exception {
    var b = block("expertise_group", "frontend");
    var out = save("ed", "[{\"id\":\"" + b.get("id").asString() + "\",\"version\":" + b.get("version").asLong() + ",\"delete\":true}]", 200);
    assertTrue(out.get("blocks").get(0).get("draftDeleted").asBoolean());
    var preview = ok(call("GET", "/api/admin/studio/preview", "ed", null), 200).get("content");
    assertEquals(7, preview.get("expertiseData").size());
    assertEquals(8, site().get("expertiseData").size());
    ok(call("POST", "/api/admin/studio/discard", "ed", "{\"ids\":[\"" + b.get("id").asString() + "\"]}"), 200);
    assertFalse(block("expertise_group", "frontend").get("pending").asBoolean());
  }

  @Test
  void reorderingIsAPendingChangeAndDiscardRestoresTheOrder() throws Exception {
    var a = block("experience", "experience-1");
    var out = save("ed", "[{\"id\":\"" + a.get("id").asString() + "\",\"version\":" + a.get("version").asLong() + ",\"position\":6}]", 200);
    assertEquals(6, out.get("blocks").get(0).get("position").asInt());
    assertTrue(out.get("blocks").get(0).get("pending").asBoolean());
    var preview = ok(call("GET", "/api/admin/studio/preview", "ed", null), 200).get("content");
    assertEquals("experience-1", preview.at("/experiences/5/id").asString());
    assertEquals("experience-2", preview.at("/experiences/0/id").asString());
    assertEquals(seed(), site());
    var back = ok(call("POST", "/api/admin/studio/discard", "ed", "{\"ids\":[\"" + a.get("id").asString() + "\"]}"), 200);
    assertEquals(0, back.get("blocks").get(0).get("position").asInt());
    assertEquals(0, studio().get("pendingCount").asInt());
  }

  // ---- history and restore ---------------------------------------------------------------

  @Test
  void historyHoldsAtMostThreeRevisionsAndRestoreCopiesOneIntoTheDraft() throws Exception {
    for (int i = 1; i <= 4; i++) {
      var b = block("experience", "experience-1");
      save("pub", "[" + editExperience(b, "revision " + i) + "]", 200);
      ok(call("POST", "/api/admin/releases", "pub", "{}"), 201);
    }
    var id = block("experience", "experience-1").get("id").asString();
    var history = ok(call("GET", "/api/admin/studio/blocks/" + id + "/history", "ed", null), 200);
    assertEquals(3, history.get("revisions").size());
    assertEquals("revision 4", history.at("/revisions/0/data/description").asString());
    assertEquals("revision 2", history.at("/revisions/2/data/description").asString());
    assertEquals(3, sql.queryForObject("SELECT count(*) FROM content_block_revision WHERE block_id=?::uuid", Integer.class, id));

    int rev = history.at("/revisions/2/rev").asInt();
    var restored = ok(call("POST", "/api/admin/studio/blocks/" + id + "/restore/" + rev, "ed", null), 200);
    assertEquals("revision 2", restored.at("/draft/description").asString());
    assertEquals("revision 4", restored.at("/published/description").asString());
    int live = history.at("/revisions/0/rev").asInt();
    var same = ok(call("POST", "/api/admin/studio/blocks/" + id + "/restore/" + live, "ed", null), 200);
    assertTrue(same.get("draft").isNull(), "restoring the live version leaves no draft");
    assertEquals(404, call("POST", "/api/admin/studio/blocks/" + id + "/restore/999", "ed", null).statusCode());
    assertEquals(404, call("GET", "/api/admin/studio/blocks/" + UUID.randomUUID() + "/history", "ed", null).statusCode());
    assertEquals(live, lastAuditDetails("studio.restore").get("rev").asInt());
  }

  // ---- publish and releases --------------------------------------------------------------

  @Test
  void publishNeedsThePublishPermission() throws Exception {
    save("ed", "[" + editExperience(block("experience", "experience-1"), "needs approval") + "]", 200);
    var r = call("POST", "/api/admin/releases", "ed", "{}");
    assertEquals(403, r.statusCode());
    assertEquals("forbidden", json.readTree(r.body()).get("code").asString());
    assertEquals(201, call("POST", "/api/admin/releases", "pub", "{}").statusCode());
  }

  @Test
  void publishAppliesDraftsCreatesAQueuedReleaseWithTheExactSnapshotAndDispatches() throws Exception {
    var b = block("experience", "experience-1");
    save("ed", "[" + editExperience(b, "Shipped it.") + "]", 200);
    var release = ok(call("POST", "/api/admin/releases", "pub", "{\"note\":\"Update experience\"}"), 201);
    assertEquals("queued", release.get("status").asString());
    assertEquals("Update experience", release.get("note").asString());
    long id = release.get("id").asLong();

    var after = block("experience", "experience-1");
    assertTrue(after.get("draft").isNull());
    assertEquals("Shipped it.", after.at("/published/description").asString());
    assertEquals(0, ok(call("GET", "/api/admin/studio", "ed", null), 200).get("pendingCount").asInt());

    ObjectNode expected = ((ObjectNode) seed()).deepCopy();
    ((ObjectNode) expected.get("experiences").get(0)).put("description", "Shipped it.");
    var snapshot = json.readTree(sql.queryForObject("SELECT snapshot::text FROM site_release WHERE id=?", String.class, id));
    assertEquals(expected, snapshot);
    assertEquals(List.of("seo", "copy", "profile", "navigation", "caseStudies", "experiences", "workProjects", "expertiseData"),
        new ArrayList<>(snapshot.propertyNames()));

    assertTrue(app.getBean(LoggingReleaseDispatcher.class).dispatched().contains(id));
    assertEquals("release.publish", sql.queryForObject("SELECT action FROM audit_events WHERE action='release.publish'", String.class));
    assertEquals(id, lastAuditDetails("release.publish").get("releaseId").asLong());
    assertFalse(ok(call("GET", "/api/admin/summary", "ed", null), 200).get("draftPending").asBoolean());
    assertEquals(409, call("POST", "/api/admin/releases", "pub", "{}").statusCode());
    assertEquals("nothing_to_publish", json.readTree(call("POST", "/api/admin/releases", "pub", "{}").body()).get("code").asString());
  }

  @Test
  void publishAppliesDeletesAdditionsAndOrderTogether() throws Exception {
    var del = block("expertise_group", "frontend");
    var mv = block("experience", "experience-1");
    String nav = "{\"type\":\"navigation_item\",\"draft\":{\"href\":\"/blog\",\"label\":\"Blog\"}}";
    save("ed", "[{\"id\":\"" + del.get("id").asString() + "\",\"version\":" + del.get("version").asLong() + ",\"delete\":true},"
        + "{\"id\":\"" + mv.get("id").asString() + "\",\"version\":" + mv.get("version").asLong() + ",\"position\":6}," + nav + "]", 200);
    var draftPreview = ok(call("GET", "/api/admin/studio/preview", "ed", null), 200).get("content");
    ok(call("POST", "/api/admin/releases", "owner", "{}"), 201);
    assertEquals(8, site().get("expertiseData").size(), "the blob-backed /api/site is unchanged until cutover");
    var snap = json.readTree(sql.queryForObject(
        "SELECT snapshot::text FROM site_release ORDER BY id DESC LIMIT 1", String.class));
    assertEquals(7, snap.get("expertiseData").size());
    assertEquals("experience-1", snap.at("/experiences/5/id").asString());
    assertEquals(draftPreview, json.readTree(sql.queryForObject(
        "SELECT snapshot::text FROM site_release ORDER BY id DESC LIMIT 1", String.class)),
        "what was previewed is exactly what was released");
    assertEquals(5, json.readTree(sql.queryForObject("SELECT snapshot::text FROM site_release ORDER BY id DESC LIMIT 1", String.class)).get("navigation").size());
    assertEquals(0, sql.queryForObject("SELECT count(*) FROM content_block WHERE slug='frontend'", Integer.class));
  }

  @Test
  void aFailedPublishChangesNothing() throws Exception {
    var b = block("experience", "experience-1");
    save("ed", "[" + editExperience(b, "valid edit") + "]", 200);
    // Sneak an invalid draft past the save-time validation (e.g. a schema tightened later).
    sql.update("UPDATE content_block SET draft='{\"bogus\":1}'::jsonb WHERE type='experience' AND slug='experience-2'");
    var r = call("POST", "/api/admin/releases", "pub", "{}");
    assertEquals(422, r.statusCode());
    assertEquals(0, sql.queryForObject("SELECT count(*) FROM site_release", Integer.class));
    assertEquals(2, sql.queryForObject("SELECT count(*) FROM content_block WHERE draft IS NOT NULL", Integer.class));
    assertEquals(1, sql.queryForObject("SELECT count(*) FROM content_block_revision r JOIN content_block b ON b.id=r.block_id WHERE b.slug='experience-1'", Integer.class));
  }

  @Test
  void onlyTheLastThreeReleasesAreKeptAndListedNewestFirst() throws Exception {
    for (int i = 1; i <= 4; i++) {
      save("pub", "[" + editExperience(block("experience", "experience-1"), "edit " + i) + "]", 200);
      ok(call("POST", "/api/admin/releases", "pub", "{}"), 201);
    }
    var list = ok(call("GET", "/api/admin/releases", "ed", null), 200);
    assertEquals(3, list.size());
    assertTrue(list.get(0).get("id").asLong() > list.get(1).get("id").asLong());
    assertEquals(3, sql.queryForObject("SELECT count(*) FROM site_release", Integer.class));
    assertFalse(list.get(0).has("snapshot"));
  }

  @Test
  void rollbackReleasesAnOlderSnapshotAsANewRelease() throws Exception {
    save("pub", "[" + editExperience(block("experience", "experience-1"), "version A") + "]", 200);
    long a = ok(call("POST", "/api/admin/releases", "pub", "{}"), 201).get("id").asLong();
    save("pub", "[" + editExperience(block("experience", "experience-1"), "version B") + "]", 200);
    long b = ok(call("POST", "/api/admin/releases", "pub", "{}"), 201).get("id").asLong();
    assertEquals(403, call("POST", "/api/admin/releases/" + a + "/rollback", "ed", null).statusCode());

    var rolled = ok(call("POST", "/api/admin/releases/" + a + "/rollback", "pub", null), 201);
    long c = rolled.get("id").asLong();
    assertTrue(c > b);
    assertEquals("queued", rolled.get("status").asString());
    assertEquals(json.readTree(sql.queryForObject("SELECT snapshot::text FROM site_release WHERE id=?", String.class, a)),
        json.readTree(sql.queryForObject("SELECT snapshot::text FROM site_release WHERE id=?", String.class, c)));
    assertTrue(app.getBean(LoggingReleaseDispatcher.class).dispatched().contains(c));
    assertEquals("release.rollback", sql.queryForObject("SELECT action FROM audit_events WHERE action='release.rollback'", String.class));
    assertEquals(404, call("POST", "/api/admin/releases/999999/rollback", "pub", null).statusCode());
  }

  @Test
  void discardAndRestoreAreAudited() throws Exception {
    var b = block("experience", "experience-1");
    save("ed", "[" + editExperience(b, "will discard") + "]", 200);
    ok(call("POST", "/api/admin/studio/discard", "ed", "{\"ids\":[\"" + b.get("id").asString() + "\"]}"), 200);
    assertEquals(b.get("id").asString(), lastAuditDetails("studio.discard").at("/blocks/0/id").asString());
  }

  // ---- CI callbacks ----------------------------------------------------------------------

  static HttpResponse<String> publicCall(String method, String path, Map<String, String> headers, String body)
      throws Exception {
    var b = HttpRequest.newBuilder(URI.create(base + path)).header("Content-Type", "application/json");
    headers.forEach(b::header);
    b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
    return HttpClient.newHttpClient().send(b.build(), HttpResponse.BodyHandlers.ofString());
  }

  static long newRelease() throws Exception {
    var b = block("experience", "experience-1");
    save("pub", "[" + editExperience(b, "release " + System.nanoTime()) + "]", 200);
    return ok(call("POST", "/api/admin/releases", "pub", "{}"), 201).get("id").asLong();
  }

  static Map<String, String> ci(long id, long exp) {
    var t = app.getBean(ReleaseTokens.class);
    return Map.of("X-Release-Token", t.sign(id, exp), "X-Release-Expires", Long.toString(exp));
  }

  static String status(long id) {
    return sql.queryForObject("SELECT status FROM site_release WHERE id=?", String.class, id);
  }

  @Test
  void publicSnapshotNeedsAValidTokenAndIsNotCached() throws Exception {
    long id = newRelease();
    var t = app.getBean(ReleaseTokens.class);
    long exp = t.newExpiry();
    String url = "/api/public/releases/" + id + "?token=" + t.sign(id, exp) + "&exp=" + exp;
    var r = publicCall("GET", url, Map.of(), null);
    assertEquals(200, r.statusCode());
    assertEquals("no-store", r.headers().firstValue("Cache-Control").orElseThrow());
    assertEquals(
        json.readTree(sql.queryForObject("SELECT snapshot::text FROM site_release WHERE id=?", String.class, id)),
        json.readTree(r.body()));
    assertEquals(401, publicCall("GET", "/api/public/releases/" + id, Map.of(), null).statusCode());
    assertEquals(401, publicCall("GET", url.replace("token=", "token=0"), Map.of(), null).statusCode());
    assertEquals(401, publicCall("GET", "/api/public/releases/" + (id + 1) + "?token=" + t.sign(id, exp) + "&exp=" + exp, Map.of(), null).statusCode());
    long past = Instant.now().getEpochSecond() - 5;
    assertEquals(401, publicCall("GET", "/api/public/releases/" + id + "?token=" + t.sign(id, past) + "&exp=" + past, Map.of(), null).statusCode());
  }

  @Test
  void ciStatusMovesForwardOnlyAndSupersedesOlderLiveReleases() throws Exception {
    long a = newRelease();
    long exp = app.getBean(ReleaseTokens.class).newExpiry();
    String run = "{\"status\":\"%s\",\"runUrl\":\"https://github.com/Sravanastech/ssp-portfolio/actions/runs/1\"}";
    var building = publicCall("POST", "/api/public/releases/" + a + "/status", ci(a, exp), run.formatted("building"));
    assertEquals(200, building.statusCode(), building.body());
    assertEquals("building", status(a));
    assertEquals(200, publicCall("POST", "/api/public/releases/" + a + "/status", ci(a, exp), run.formatted("building")).statusCode());
    var live = ok(publicCall("POST", "/api/public/releases/" + a + "/status", ci(a, exp), run.formatted("live")), 200);
    assertEquals("live", live.get("status").asString());
    assertNotNull(live.get("finishedAt").asString());
    assertTrue(live.get("runUrl").asString().endsWith("/runs/1"));
    assertEquals(409, publicCall("POST", "/api/public/releases/" + a + "/status", ci(a, exp), run.formatted("building")).statusCode());
    assertEquals(409, publicCall("POST", "/api/public/releases/" + a + "/status", ci(a, exp), run.formatted("failed")).statusCode());

    long b = newRelease();
    assertEquals(200, publicCall("POST", "/api/public/releases/" + b + "/status", ci(b, exp), run.formatted("live")).statusCode());
    assertEquals("superseded", status(a));
    assertEquals("live", status(b));
    long c = newRelease();
    assertEquals(200, publicCall("POST", "/api/public/releases/" + c + "/status", ci(c, exp), run.formatted("failed")).statusCode());
    assertEquals("live", status(b), "a failed build leaves the live release alone");
  }

  @Test
  void ciStatusRejectsBadTokensAndBodies() throws Exception {
    long a = newRelease();
    long b = newRelease();
    long exp = app.getBean(ReleaseTokens.class).newExpiry();
    String live = "{\"status\":\"live\"}";
    assertEquals(401, publicCall("POST", "/api/public/releases/" + a + "/status", Map.of(), live).statusCode());
    assertEquals(401, publicCall("POST", "/api/public/releases/" + a + "/status", ci(b, exp), live).statusCode(), "token of another release");
    assertEquals(400, publicCall("POST", "/api/public/releases/" + a + "/status", ci(a, exp), "{\"status\":\"queued\"}").statusCode());
    assertEquals(400, publicCall("POST", "/api/public/releases/" + a + "/status", ci(a, exp), "{\"status\":\"live\",\"runUrl\":\"http://evil.example/x\"}").statusCode());
    assertEquals(404, publicCall("POST", "/api/public/releases/999999/status", ci(999999, exp), live).statusCode());
    assertEquals("queued", status(a));
  }
}
