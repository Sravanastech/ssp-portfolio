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

  public void invalidateOpenFor(String email) {
    db.update(
        "UPDATE resume_otp_challenge SET invalidated_at=now() WHERE email=? AND consumed_at IS"
            + " NULL AND invalidated_at IS NULL",
        email);
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

  public int failedVerifiesByEmail(String email, Instant since) {
    return failed("email=?", email, since);
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
