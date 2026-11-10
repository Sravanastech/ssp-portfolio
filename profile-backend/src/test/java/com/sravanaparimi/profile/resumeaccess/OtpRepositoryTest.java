package com.sravanaparimi.profile.resumeaccess;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;

class OtpRepositoryTest {
  @SuppressWarnings("resource") // stopped in @AfterAll
  static PostgreSQLContainer db =
      new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("test_otp");

  static JdbcTemplate sql;
  static OtpRepository otp;
  static VisitorRepository visitors;
  static final byte[] HMAC = {1, 2, 3};
  static final byte[] IP = {9, 9};

  @BeforeAll
  static void start() {
    db.start();
    var ds = new DriverManagerDataSource(db.getJdbcUrl(), db.getUsername(), db.getPassword());
    Flyway.configure().dataSource(ds).load().migrate();
    sql = new JdbcTemplate(ds);
    otp = new OtpRepository(sql);
    visitors = new VisitorRepository(sql);
  }

  @AfterAll
  static void stop() {
    db.stop();
  }

  @BeforeEach
  void clean() {
    sql.update("DELETE FROM resume_otp_challenge");
    sql.update("DELETE FROM resume_visitor");
  }

  static OtpRepository.Challenge challenge(String email, byte[] ip, Instant expires) {
    return new OtpRepository.Challenge(UUID.randomUUID(), email, HMAC, ip, expires);
  }

  static OtpRepository.Challenge open(String email) {
    return challenge(email, IP, Instant.now().plus(10, ChronoUnit.MINUTES));
  }

  @Test
  void insertStoresChallengeWithZeroAttempts() {
    var c = open("a@x.com");
    otp.insert(c);
    assertEquals(
        0, sql.queryForObject("SELECT attempts FROM resume_otp_challenge", Integer.class));
  }

  @Test
  void invalidateOpenForOnlyAffectsThatEmail() {
    var a = open("a@x.com");
    var b = open("b@x.com");
    otp.insert(a);
    otp.insert(b);
    otp.invalidateOpenFor("a@x.com");
    assertTrue(otp.spendAttempt(a.id()).isEmpty());
    assertTrue(otp.spendAttempt(b.id()).isPresent());
  }

  @Test
  void spendAttemptReturnsHmacAndCounts() {
    var c = open("a@x.com");
    otp.insert(c);
    assertArrayEquals(HMAC, otp.spendAttempt(c.id()).orElseThrow());
    assertEquals(
        1, sql.queryForObject("SELECT attempts FROM resume_otp_challenge", Integer.class));
  }

  @Test
  void spendAttemptStopsAfterFive() {
    var c = open("a@x.com");
    otp.insert(c);
    for (int i = 0; i < 5; i++) assertTrue(otp.spendAttempt(c.id()).isPresent());
    assertTrue(otp.spendAttempt(c.id()).isEmpty());
  }

  @Test
  void spendAttemptRejectsExpiredConsumedAndUnknown() {
    var expired = challenge("a@x.com", IP, Instant.now().minusSeconds(5));
    otp.insert(expired);
    assertTrue(otp.spendAttempt(expired.id()).isEmpty());
    var c = open("b@x.com");
    otp.insert(c);
    assertTrue(otp.consume(c.id()));
    assertTrue(otp.spendAttempt(c.id()).isEmpty());
    assertTrue(otp.spendAttempt(UUID.randomUUID()).isEmpty());
  }

  @Test
  void concurrentSpendAttemptNeverExceedsFive() throws Exception {
    var c = open("a@x.com");
    otp.insert(c);
    var successes = new AtomicInteger();
    try (var pool = Executors.newFixedThreadPool(20)) {
      var start = new CountDownLatch(1);
      var futures = new ArrayList<Future<?>>();
      for (int i = 0; i < 20; i++)
        futures.add(
            pool.submit(
                () -> {
                  start.await();
                  if (otp.spendAttempt(c.id()).isPresent()) successes.incrementAndGet();
                  return null;
                }));
      start.countDown();
      for (var f : futures) f.get(30, TimeUnit.SECONDS);
    }
    assertEquals(5, successes.get());
    assertEquals(
        5, sql.queryForObject("SELECT attempts FROM resume_otp_challenge", Integer.class));
  }

  @Test
  void concurrentConsumeYieldsExactlyOneWinner() throws Exception {
    var c = open("a@x.com");
    otp.insert(c);
    var wins = new AtomicInteger();
    try (var pool = Executors.newFixedThreadPool(10)) {
      var start = new CountDownLatch(1);
      var futures = new ArrayList<Future<?>>();
      for (int i = 0; i < 10; i++)
        futures.add(
            pool.submit(
                () -> {
                  start.await();
                  if (otp.consume(c.id())) wins.incrementAndGet();
                  return null;
                }));
      start.countDown();
      for (var f : futures) f.get(30, TimeUnit.SECONDS);
    }
    assertEquals(1, wins.get());
  }

  @Test
  void consumeFailsForInvalidatedChallenge() {
    var c = open("a@x.com");
    otp.insert(c);
    otp.invalidateOpenFor("a@x.com");
    assertFalse(otp.consume(c.id()));
  }

  @Test
  void sendCountsRespectWindowAndScope() {
    var since = Instant.now().minus(15, ChronoUnit.MINUTES);
    otp.insert(open("a@x.com"));
    otp.insert(open("a@x.com"));
    otp.insert(challenge("b@x.com", new byte[] {7}, Instant.now().plusSeconds(600)));
    sql.update(
        "UPDATE resume_otp_challenge SET created_at = now() - interval '1 hour' WHERE id ="
            + " (SELECT id FROM resume_otp_challenge WHERE email='a@x.com' LIMIT 1)");
    assertEquals(1, otp.countSendsByEmail("a@x.com", since));
    assertEquals(2, otp.countSendsByEmail("a@x.com", since.minus(2, ChronoUnit.HOURS)));
    assertEquals(1, otp.countSendsByIp(new byte[] {7}, since));
    assertEquals(2, otp.countSendsByIp(IP, since.minus(2, ChronoUnit.HOURS)));
    assertEquals(2, otp.countSendsGlobal(since));
  }

  @Test
  void failedVerifiesCountOnlyNonConsumedChallenges() {
    var a = open("a@x.com");
    var b = open("a@x.com");
    otp.insert(a);
    otp.insert(b);
    otp.spendAttempt(a.id());
    otp.spendAttempt(a.id());
    otp.spendAttempt(b.id());
    assertEquals(3, otp.failedVerifiesByEmail("a@x.com", Instant.now().minusSeconds(3600)));
    assertTrue(otp.consume(b.id()));
    assertEquals(2, otp.failedVerifiesByEmail("a@x.com", Instant.now().minusSeconds(3600)));
    assertEquals(0, otp.failedVerifiesByEmail("other@x.com", Instant.now().minusSeconds(3600)));
  }

  @Test
  void failedVerifiesByIpCountsAttemptsForThatIp() {
    var a = open("a@x.com");
    otp.insert(a);
    otp.spendAttempt(a.id());
    assertEquals(1, otp.failedVerifiesByIp(IP, Instant.now().minusSeconds(3600)));
    assertEquals(0, otp.failedVerifiesByIp(new byte[] {5}, Instant.now().minusSeconds(3600)));
  }

  @Test
  void purgeRemovesOldRowsInBatches() {
    for (int i = 0; i < 5; i++) otp.insert(open("a" + i + "@x.com"));
    sql.update("UPDATE resume_otp_challenge SET created_at = now() - interval '2 days'");
    otp.insert(open("fresh@x.com"));
    var cutoff = Instant.now().minus(24, ChronoUnit.HOURS);
    assertEquals(3, otp.purgeOlderThan(cutoff, 3));
    assertEquals(2, otp.purgeOlderThan(cutoff, 3));
    assertEquals(0, otp.purgeOlderThan(cutoff, 3));
    assertEquals(
        1, sql.queryForObject("SELECT count(*) FROM resume_otp_challenge", Integer.class));
  }

  @Test
  void visitorUpsertCreatesThenIncrements() {
    visitors.upsert("a@x.com", IP);
    visitors.upsert("a@x.com", new byte[] {4});
    assertEquals(1, visitors.count());
    var row = visitors.page(0, 25).getFirst();
    assertEquals("a@x.com", row.email());
    assertEquals(2, row.verifyCount());
    assertFalse(row.lastVerifiedAt().isBefore(row.firstVerifiedAt()));
  }

  @Test
  void visitorPageIsNewestFirstAndPaged() throws Exception {
    for (String e : List.of("a@x.com", "b@x.com", "c@x.com")) {
      visitors.upsert(e, IP);
      Thread.sleep(5);
    }
    var first = visitors.page(0, 2);
    assertEquals(List.of("c@x.com", "b@x.com"), first.stream().map(v -> v.email()).toList());
    assertEquals(List.of("a@x.com"), visitors.page(1, 2).stream().map(v -> v.email()).toList());
    assertEquals(3, visitors.count());
  }

  @Test
  void visitorDeleteReportsPresence() {
    visitors.upsert("a@x.com", IP);
    var id = visitors.page(0, 1).getFirst().id();
    assertTrue(visitors.delete(id));
    assertFalse(visitors.delete(id));
    assertEquals(0, visitors.count());
  }

  @Test
  void findReturnsEmailIpAndAttempts() {
    var c = open("a@x.com");
    otp.insert(c);
    otp.spendAttempt(c.id());
    var info = otp.find(c.id()).orElseThrow();
    assertEquals("a@x.com", info.email());
    assertArrayEquals(IP, info.ipHash());
    assertEquals(1, info.attempts());
    assertTrue(otp.find(UUID.randomUUID()).isEmpty());
  }

  @Test
  void latestSendByEmailReturnsNewestCreation() {
    assertTrue(otp.latestSendByEmail("a@x.com").isEmpty());
    otp.insert(open("a@x.com"));
    sql.update("UPDATE resume_otp_challenge SET created_at = now() - interval '1 hour'");
    otp.insert(open("a@x.com"));
    var latest = otp.latestSendByEmail("a@x.com").orElseThrow();
    assertTrue(latest.isAfter(Instant.now().minusSeconds(60)));
  }
}
