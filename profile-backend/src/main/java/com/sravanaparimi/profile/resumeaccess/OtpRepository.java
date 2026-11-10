package com.sravanaparimi.profile.resumeaccess;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class OtpRepository {
  public static final int MAX_ATTEMPTS = 5;

  public record Challenge(
      UUID id, String email, byte[] codeHmac, byte[] ipHash, Instant expiresAt) {}

  public record Info(String email, byte[] ipHash, int attempts) {}

  private final JdbcTemplate db;

  public OtpRepository(JdbcTemplate db) {
    this.db = db;
  }

  public void insert(Challenge c) {
    db.update(
        "INSERT INTO resume_otp_challenge(id,email,code_hmac,ip_hash,expires_at) VALUES"
            + " (?,?,?,?,?)",
        c.id(),
        c.email(),
        c.codeHmac(),
        c.ipHash(),
        Timestamp.from(c.expiresAt()));
  }

  /** Transaction-scoped lock serialising limit checks and inserts for one email address. */
  public void lockEmail(String email) {
    db.query("SELECT pg_advisory_xact_lock(hashtext(?))", rs -> {}, email);
  }

  /** Invalidates open challenges of this email created from the same (hashed) client IP only. */
  public void invalidateOpenFor(String email, byte[] ipHash) {
    db.update(
        "UPDATE resume_otp_challenge SET invalidated_at=now() WHERE email=? AND ip_hash=? AND"
            + " consumed_at IS NULL AND invalidated_at IS NULL",
        email,
        ipHash);
  }

  /** Atomically spends one attempt and returns the stored HMAC; empty if no longer open. */
  public Optional<byte[]> spendAttempt(UUID id) {
    return db
        .query(
            "UPDATE resume_otp_challenge SET attempts=attempts+1 WHERE id=? AND consumed_at IS"
                + " NULL AND invalidated_at IS NULL AND attempts<? AND expires_at>now() RETURNING"
                + " code_hmac",
            (rs, n) -> rs.getBytes(1),
            id,
            MAX_ATTEMPTS)
        .stream()
        .findFirst();
  }

  /** Removes a challenge whose email was never delivered so it counts toward no limit. */
  public boolean discard(UUID id) {
    return db.update("DELETE FROM resume_otp_challenge WHERE id=?", id) == 1;
  }

  public Optional<Info> find(UUID id) {
    return db
        .query(
            "SELECT email,ip_hash,attempts FROM resume_otp_challenge WHERE id=?",
            (rs, n) -> new Info(rs.getString(1), rs.getBytes(2), rs.getInt(3)),
            id)
        .stream()
        .findFirst();
  }

  public Optional<Instant> latestSendByEmail(String email) {
    Timestamp ts =
        db.queryForObject(
            "SELECT max(created_at) FROM resume_otp_challenge WHERE email=?",
            Timestamp.class,
            email);
    return Optional.ofNullable(ts).map(Timestamp::toInstant);
  }

  public boolean consume(UUID id) {
    return db.update(
            "UPDATE resume_otp_challenge SET consumed_at=now() WHERE id=? AND consumed_at IS NULL"
                + " AND invalidated_at IS NULL AND expires_at>now()",
            id)
        == 1;
  }

  public int countSendsByEmail(String email, Instant since) {
    return count("email=?", email, since);
  }

  public int countSendsByIp(byte[] ipHash, Instant since) {
    return count("ip_hash=?", ipHash, since);
  }

  public int countSendsGlobal(Instant since) {
    return db.queryForObject(
        "SELECT count(*) FROM resume_otp_challenge WHERE created_at>=?",
        Integer.class,
        Timestamp.from(since));
  }

  public int failedVerifiesByIp(byte[] ipHash, Instant since) {
    return failed("ip_hash=?", ipHash, since);
  }

  /** Deletes up to {@code batch} rows created before {@code cutoff}; returns rows deleted. */
  public int purgeOlderThan(Instant cutoff, int batch) {
    return db.update(
        "DELETE FROM resume_otp_challenge WHERE id IN (SELECT id FROM resume_otp_challenge WHERE"
            + " created_at<? ORDER BY created_at LIMIT ?)",
        Timestamp.from(cutoff),
        batch);
  }

  private int count(String where, Object key, Instant since) {
    return db.queryForObject(
        "SELECT count(*) FROM resume_otp_challenge WHERE " + where + " AND created_at>=?",
        Integer.class,
        key,
        Timestamp.from(since));
  }

  private int failed(String where, Object key, Instant since) {
    return db.queryForObject(
        "SELECT coalesce(sum(attempts),0) FROM resume_otp_challenge WHERE "
            + where
            + " AND consumed_at IS NULL AND created_at>=?",
        Integer.class,
        key,
        Timestamp.from(since));
  }
}
