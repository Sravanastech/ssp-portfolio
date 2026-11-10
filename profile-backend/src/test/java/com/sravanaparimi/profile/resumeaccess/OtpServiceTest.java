package com.sravanaparimi.profile.resumeaccess;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.env.MockEnvironment;
import org.testcontainers.postgresql.PostgreSQLContainer;
import com.sravanaparimi.profile.platform.EmailGateway;
import tools.jackson.databind.json.JsonMapper;

class OtpServiceTest {
  @SuppressWarnings("resource") // stopped in @AfterAll
  static PostgreSQLContainer db =
      new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("test_otp_service");

  static final JsonMapper JSON = JsonMapper.builder().build();
  static final String IP = "203.0.113.7";
  static JdbcTemplate sql;
  static OtpRepository otp;
  static VisitorRepository visitors;
  static OtpCrypto crypto;
  static ResumeTokenService tokens;

  @TempDir Path media;
  AtomicBoolean captchaOk;
  AtomicReference<String> captchaIp;
  AtomicInteger captchaCalls;
  MockEnvironment env;
  OtpService svc;

  @BeforeAll
  static void start() {
    db.start();
    var ds = new DriverManagerDataSource(db.getJdbcUrl(), db.getUsername(), db.getPassword());
    Flyway.configure().dataSource(ds).load().migrate();
    sql = new JdbcTemplate(ds);
    otp = new OtpRepository(sql);
    visitors = new VisitorRepository(sql);
    crypto = OtpCrypto.of("unit-test-secret-0123456789-abcdefghij", false);
    tokens = new ResumeTokenService(crypto);
  }

  @AfterAll
  static void stop() {
    db.stop();
  }

  @BeforeEach
  void setUp() {
    sql.update("DELETE FROM resume_otp_challenge");
    sql.update("DELETE FROM resume_visitor");
    captchaOk = new AtomicBoolean(true);
    captchaIp = new AtomicReference<>();
    captchaCalls = new AtomicInteger();
    env =
        new MockEnvironment()
            .withProperty("profile.email.mode", "capture")
            .withProperty("profile.media.root", media.toString())
            .withProperty("profile.inquiries.ip-salt", "0123456789abcdef-salt")
            .withProperty("profile.resume-otp.enabled", "true");
    svc = service(env);
  }

  OtpService service(MockEnvironment e) {
    TurnstileVerifier fake =
        (token, ip) -> {
          captchaCalls.incrementAndGet();
          captchaIp.set(ip);
          return captchaOk.get();
        };
    return new OtpService(
        otp,
        visitors,
        new EmailGateway(e, JSON),
        fake,
        crypto,
        tokens,
        e,
        new org.springframework.jdbc.datasource.DataSourceTransactionManager(sql.getDataSource()));
  }

  String codeFor(UUID id) throws Exception {
    return JSON.readTree(Files.readString(media.resolve("capture/otp-" + id + ".json")))
        .get("code")
        .asString();
  }

  long captureFiles() throws Exception {
    Path dir = media.resolve("capture");
    if (!Files.exists(dir)) return 0;
    try (var s = Files.list(dir)) {
      return s.count();
    }
  }

  /** Inserts a challenge with a known code for direct verify tests. */
  UUID seed(String email, String code, String ip) {
    var id = UUID.randomUUID();
    otp.insert(
        new OtpRepository.Challenge(
            id, email, crypto.hmac(code, id), svc.ipHash(ip), Instant.now().plusSeconds(600)));
    return id;
  }

  void age(String where, String interval) {
    sql.update("UPDATE resume_otp_challenge SET created_at = now() - interval '" + interval + "' WHERE " + where);
  }

  OtpException failure(org.junit.jupiter.api.function.Executable e) {
    return assertThrows(OtpException.class, e);
  }

  @Test
  void happyPathIssuesTokenAndRecordsVisitorWithNormalizedEmail() throws Exception {
    var r = svc.request("  A.B+tag@Example.COM ", "tok", IP);
    String token = svc.verify(r.challengeId(), codeFor(r.challengeId()), IP);
    assertEquals("a.b+tag@example.com", tokens.parse(token).email());
    assertEquals(1, visitors.count());
    assertEquals("a.b+tag@example.com", visitors.page(0, 5).getFirst().email());
    assertEquals(IP, captchaIp.get());
  }

  @Test
  void invalidEmailsAreRejectedBeforeCaptchaAndStorage() throws Exception {
    for (String bad :
        new String[] {null, "", "nope", "a@b", "a@b..com", "a b@x.com", "a@x.com\r\nBcc: z@x.com",
          "<a@x.com>", "a@x.com,b@x.com", "x".repeat(250) + "@x.com"}) {
      var ex = failure(() -> svc.request(bad, "tok", IP));
      assertEquals(400, ex.status());
      assertEquals("invalid_request", ex.code());
    }
    assertEquals(0, captchaCalls.get());
    assertEquals(0, otp.countSendsGlobal(Instant.now().minus(1, ChronoUnit.DAYS)));
  }

  @Test
  void captchaFailureStopsBeforeAnyDatabaseWriteOrEmail() throws Exception {
    sql.update("DELETE FROM resume_otp_challenge");
    captchaOk.set(false);
    var ex = failure(() -> svc.request("a@x.com", "bad", IP));
    assertEquals(403, ex.status());
    assertEquals("captcha_failed", ex.code());
    assertEquals(0, otp.countSendsGlobal(Instant.now().minus(1, ChronoUnit.DAYS)));
    assertEquals(0, captureFiles());
  }

  @Test
  void wrongCodesCountDownThenChallengeIsDeadEvenForTheRightCode() throws Exception {
    var r = svc.request("a@x.com", "tok", IP);
    String good = codeFor(r.challengeId());
    String wrong = good.equals("000000") ? "000001" : "000000";
    for (int expected = 4; expected >= 0; expected--) {
      var ex = failure(() -> svc.verify(r.challengeId(), wrong, IP));
      assertEquals(400, ex.status());
      assertEquals("invalid_code", ex.code());
      assertEquals(expected, ex.attemptsRemaining());
    }
    var dead = failure(() -> svc.verify(r.challengeId(), good, IP));
    assertEquals("invalid_code", dead.code());
    assertEquals(0, visitors.count());
  }

  @Test
  void expiredConsumedAndUnknownChallengesAllLookIdentical() throws Exception {
    var expired = seed("a@x.com", "123456", IP);
    sql.update("UPDATE resume_otp_challenge SET expires_at = now() - interval '1 second'");
    var used = seed("b@x.com", "123456", IP);
    svc.verify(used, "123456", IP);
    for (UUID id : new UUID[] {expired, used, UUID.randomUUID()}) {
      var ex = failure(() -> svc.verify(id, "123456", IP));
      assertEquals(400, ex.status());
      assertEquals("invalid_code", ex.code());
      assertEquals(0, ex.attemptsRemaining());
    }
    assertEquals(1, visitors.page(0, 5).getFirst().verifyCount());
  }

  @Test
  void parallelCorrectVerifiesYieldExactlyOneToken() throws Exception {
    var id = seed("a@x.com", "123456", IP);
    var ok = new AtomicInteger();
    var rejected = new AtomicInteger();
    try (var pool = Executors.newFixedThreadPool(8)) {
      var start = new CountDownLatch(1);
      var futures = new ArrayList<Future<?>>();
      for (int i = 0; i < 8; i++)
        futures.add(
            pool.submit(
                () -> {
                  start.await();
                  try {
                    svc.verify(id, "123456", IP);
                    ok.incrementAndGet();
                  } catch (OtpException ex) {
                    rejected.incrementAndGet();
                  }
                  return null;
                }));
      start.countDown();
      for (var f : futures) f.get(30, TimeUnit.SECONDS);
    }
    assertEquals(1, ok.get());
    assertEquals(7, rejected.get());
    assertEquals(1, visitors.count());
    assertEquals(1, visitors.page(0, 5).getFirst().verifyCount());
  }

  @Test
  void newRequestInvalidatesThePreviousOpenChallenge() throws Exception {
    var first = svc.request("a@x.com", "tok", IP);
    String firstCode = codeFor(first.challengeId());
    age("true", "2 minutes");
    var second = svc.request("a@x.com", "tok", IP);
    assertNotEquals(first.challengeId(), second.challengeId());
    assertEquals("invalid_code", failure(() -> svc.verify(first.challengeId(), firstCode, IP)).code());
    assertNotNull(svc.verify(second.challengeId(), codeFor(second.challengeId()), IP));
  }

  @Test
  void resendCooldownBlocksAnImmediateSecondRequest() throws Exception {
    svc.request("a@x.com", "tok", IP);
    var ex = failure(() -> svc.request("a@x.com", "tok", IP));
    assertEquals(429, ex.status());
    assertEquals("rate_limited", ex.code());
    assertTrue(ex.retryAfterSeconds() >= 1 && ex.retryAfterSeconds() <= 45);
  }

  @Test
  void threePerEmailPerFifteenMinutes() throws Exception {
    for (int i = 0; i < 3; i++) seed("a@x.com", "123456", "198.51.100." + i);
    age("true", "2 minutes");
    var ex = failure(() -> svc.request("a@x.com", "tok", IP));
    assertEquals(429, ex.status());
    assertEquals("rate_limited", ex.code());
    assertTrue(ex.retryAfterSeconds() > 45);
  }

  @Test
  void sixPerEmailPerDay() throws Exception {
    for (int i = 0; i < 6; i++) seed("a@x.com", "123456", "198.51.100." + i);
    age("true", "1 hour");
    var ex = failure(() -> svc.request("a@x.com", "tok", IP));
    assertEquals(429, ex.status());
    assertEquals("rate_limited", ex.code());
  }

  @Test
  void tenPerIpHashPerHourButOtherIpsUnaffected() throws Exception {
    for (int i = 0; i < 10; i++) seed("u" + i + "@x.com", "123456", IP);
    age("true", "5 minutes");
    var ex = failure(() -> svc.request("fresh@x.com", "tok", IP));
    assertEquals(429, ex.status());
    assertDoesNotThrow(() -> svc.request("fresh@x.com", "tok", "198.51.100.50"));
  }

  @Test
  void globalDailyCapDegradesToOtpUnavailable() throws Exception {
    for (int i = 0; i < 80; i++) seed("g" + i + "@x.com", "123456", "10.0." + (i / 200) + "." + i);
    age("true", "5 hours");
    var ex = failure(() -> svc.request("fresh@x.com", "tok", IP));
    assertEquals(503, ex.status());
    assertEquals("otp_unavailable", ex.code());
  }

  @Test
  void attackerBurningAttemptsOnTheirOwnChallengesDoesNotLockTheVictim() throws Exception {
    var victim = seed("v@x.com", "123456", "198.51.100.5");
    for (int c = 0; c < 2; c++) {
      var own = seed("v@x.com", "999999", "198.51.100.66");
      for (int i = 0; i < 5; i++)
        assertThrows(OtpException.class, () -> svc.verify(own, "000000", "198.51.100.66"));
    }
    assertNotNull(svc.verify(victim, "123456", "198.51.100.5"));
  }

  @Test
  void requestFromAnotherIpDoesNotInvalidateTheVictimsOpenCode() throws Exception {
    var victim = svc.request("v@x.com", "tok", "198.51.100.5");
    String victimCode = codeFor(victim.challengeId());
    age("true", "2 minutes");
    svc.request("v@x.com", "tok", "198.51.100.66");
    assertNotNull(svc.verify(victim.challengeId(), victimCode, "198.51.100.5"));
  }

  @Test
  void guessBudgetPerEmailPerDayStaysBounded() throws Exception {
    for (int i = 0; i < 6; i++) {
      var id = seed("a@x.com", "123456", "198.51.100." + i);
      for (int n = 0; n < 5; n++) otp.spendAttempt(id);
    }
    age("true", "1 hour");
    assertEquals("rate_limited", failure(() -> svc.request("a@x.com", "tok", IP)).code());
    assertEquals(
        30, sql.queryForObject("SELECT sum(attempts) FROM resume_otp_challenge", Integer.class));
    assertEquals(
        6, otp.countSendsByEmail("a@x.com", Instant.now().minus(1, ChronoUnit.DAYS)));
  }

  @Test
  void perIpVerifyLimitLocksAcrossDifferentEmails() throws Exception {
    for (int c = 0; c < 4; c++) {
      var id = seed("u" + c + "@x.com", "123456", IP);
      for (int i = 0; i < 5; i++) assertThrows(OtpException.class, () -> svc.verify(id, "000000", IP));
    }
    var fresh = seed("victim@x.com", "123456", "198.51.100.5");
    var ex = failure(() -> svc.verify(fresh, "123456", IP));
    assertEquals("locked", ex.code());
    assertNotNull(svc.verify(fresh, "123456", "198.51.100.5"));
  }

  @Test
  void sendFailureInvalidatesChallengeAndReports503() throws Exception {
    Path blocker = Files.createFile(media.resolve("not-a-dir"));
    var broken = new MockEnvironment()
        .withProperty("profile.email.mode", "capture")
        .withProperty("profile.media.root", blocker.toString())
        .withProperty("profile.inquiries.ip-salt", "0123456789abcdef-salt")
        .withProperty("profile.resume-otp.enabled", "true");
    var ex = failure(() -> service(broken).request("a@x.com", "tok", IP));
    assertEquals(503, ex.status());
    assertEquals("send_failed", ex.code());
    // Not delivered: out of the email cap and the cooldown, but still inside IP and global caps.
    var day = Instant.now().minus(1, ChronoUnit.DAYS);
    assertEquals(0, otp.countSendsByEmail("a@x.com", day));
    assertTrue(otp.latestSendByEmail("a@x.com").isEmpty());
    assertEquals(1, otp.countSendsByIp(svc.ipHash(IP), day));
    assertEquals(1, otp.countSendsGlobal(day));
    var id = sql.queryForObject("SELECT id FROM resume_otp_challenge", UUID.class);
    assertTrue(otp.spendAttempt(id).isEmpty());
    assertTrue(sql.queryForObject("SELECT send_failed FROM resume_otp_challenge", Boolean.class));
    // An immediate retry is not blocked by the resend cooldown.
    assertDoesNotThrow(() -> svc.request("a@x.com", "tok", IP));
  }

  @Test
  void failedSendsStillConsumeThePerIpAndGlobalCaps() throws Exception {
    Path blocker = Files.createFile(media.resolve("not-a-dir"));
    var broken = new MockEnvironment()
        .withProperty("profile.email.mode", "capture")
        .withProperty("profile.media.root", blocker.toString())
        .withProperty("profile.inquiries.ip-salt", "0123456789abcdef-salt")
        .withProperty("profile.resume-otp.enabled", "true");
    var failing = service(broken);
    for (int i = 0; i < 10; i++) {
      int n = i;
      assertEquals("send_failed", failure(() -> failing.request("f" + n + "@x.com", "tok", IP)).code());
    }
    // The IP has now used its 10 sends/hour on failed attempts.
    assertEquals("rate_limited", failure(() -> svc.request("ok@x.com", "tok", IP)).code());
  }

  @Test
  void cleanupFailureStillReportsSendFailed() throws Exception {
    Path blocker = Files.createFile(media.resolve("not-a-dir"));
    var broken = new MockEnvironment()
        .withProperty("profile.email.mode", "capture")
        .withProperty("profile.media.root", blocker.toString())
        .withProperty("profile.inquiries.ip-salt", "0123456789abcdef-salt")
        .withProperty("profile.resume-otp.enabled", "true");
    var flaky =
        new OtpRepository(sql) {
          @Override
          public boolean markSendFailed(UUID id) {
            throw new IllegalStateException("db down");
          }
        };
    var service =
        new OtpService(
            flaky,
            visitors,
            new EmailGateway(broken, JSON),
            (t, i) -> true,
            crypto,
            tokens,
            broken,
            new org.springframework.jdbc.datasource.DataSourceTransactionManager(sql.getDataSource()));
    assertEquals("send_failed", failure(() -> service.request("a@x.com", "tok", IP)).code());
  }

  @Test
  void lazyPurgeRemovesRowsOlderThanADayOnly() throws Exception {
    seed("old@x.com", "123456", "198.51.100.1");
    age("true", "25 hours");
    var recent = seed("recent@x.com", "123456", "198.51.100.2");
    svc.request("new@x.com", "tok", IP);
    assertTrue(otp.find(recent).isPresent());
    assertEquals(0, sql.queryForObject("SELECT count(*) FROM resume_otp_challenge WHERE email='old@x.com'", Integer.class));
  }

  @Test
  void perIpBucketStopsJunkTokensBeforeTheCaptchaNetworkCall() throws Exception {
    captchaOk.set(false);
    int limited = 0;
    for (int i = 0; i < 15; i++) {
      var ex = failure(() -> svc.request("a@x.com", "junk", IP));
      if (ex.code().equals("rate_limited")) limited++;
      else assertEquals("captcha_failed", ex.code());
    }
    assertEquals(10, captchaCalls.get());
    assertEquals(5, limited);
    // Another client is unaffected.
    assertEquals("captcha_failed", failure(() -> svc.request("a@x.com", "junk", "198.51.100.9")).code());
  }

  @Test
  void parallelRequestsForOneEmailRespectTheLimitsAtomically() throws Exception {
    // Pre-existing rows leave room for exactly one more send inside the 15 minute window.
    for (int i = 0; i < 2; i++) seed("a@x.com", "123456", "198.51.100." + i);
    age("true", "2 minutes");
    var ok = new AtomicInteger();
    var limited = new AtomicInteger();
    try (var pool = Executors.newFixedThreadPool(8)) {
      var start = new CountDownLatch(1);
      var futures = new ArrayList<Future<?>>();
      for (int i = 0; i < 8; i++)
        futures.add(
            pool.submit(
                () -> {
                  start.await();
                  try {
                    svc.request("a@x.com", "tok", IP);
                    ok.incrementAndGet();
                  } catch (OtpException ex) {
                    if (ex.code().equals("rate_limited")) limited.incrementAndGet();
                  }
                  return null;
                }));
      start.countDown();
      for (var f : futures) f.get(30, TimeUnit.SECONDS);
    }
    assertEquals(1, ok.get());
    assertEquals(7, limited.get());
    assertEquals(
        3, otp.countSendsByEmail("a@x.com", Instant.now().minus(15, ChronoUnit.MINUTES)));
  }

  @Test
  void perIpVerifyThrottleStopsBeforeAnyDatabaseQuery() throws Exception {
    var finds = new AtomicInteger();
    var counting =
        new OtpRepository(sql) {
          @Override
          public Optional<Info> find(UUID id) {
            finds.incrementAndGet();
            return super.find(id);
          }
        };
    var service =
        new OtpService(
            counting,
            visitors,
            new EmailGateway(env, JSON),
            (t, i) -> true,
            crypto,
            tokens,
            env,
            new org.springframework.jdbc.datasource.DataSourceTransactionManager(sql.getDataSource()));
    for (int i = 0; i < 30; i++)
      assertEquals("invalid_code", failure(() -> service.verify(UUID.randomUUID(), "123456", IP)).code());
    assertEquals(30, finds.get());
    var ex = failure(() -> service.verify(UUID.randomUUID(), "123456", IP));
    assertEquals(429, ex.status());
    assertEquals("rate_limited", ex.code());
    assertTrue(ex.retryAfterSeconds() >= 1);
    assertEquals(30, finds.get());
    assertEquals(
        "invalid_code",
        failure(() -> service.verify(UUID.randomUUID(), "123456", "198.51.100.9")).code());
  }

  @Test
  void disabledFeatureReportsUnavailable() throws Exception {
    env.setProperty("profile.resume-otp.enabled", "false");
    var off = service(env);
    assertEquals("otp_unavailable", failure(() -> off.request("a@x.com", "tok", IP)).code());
    assertEquals("otp_unavailable", failure(() -> off.verify(UUID.randomUUID(), "123456", IP)).code());
  }

  @Test
  void ipv6AddressesInTheSame64ShareAnIpHash() {
    assertArrayEquals(svc.ipHash("2001:db8:0:1::1"), svc.ipHash("2001:db8:0:1:ffff::2"));
    assertFalse(Arrays.equals(svc.ipHash("2001:db8:0:1::1"), svc.ipHash("2001:db8:0:2::1")));
  }

  @Test
  void ipHashIsStableSaltedAndNotTheRawAddress() {
    assertArrayEquals(svc.ipHash(IP), svc.ipHash(IP));
    assertFalse(Arrays.equals(svc.ipHash(IP), svc.ipHash("203.0.113.8")));
    assertFalse(Arrays.equals(svc.ipHash(IP), IP.getBytes()));
    env.setProperty("profile.inquiries.ip-salt", "a-different-salt-value!");
    assertFalse(Arrays.equals(svc.ipHash(IP), service(env).ipHash(IP)));
  }
}
