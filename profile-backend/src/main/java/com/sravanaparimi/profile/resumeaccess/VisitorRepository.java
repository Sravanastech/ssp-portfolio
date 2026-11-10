package com.sravanaparimi.profile.resumeaccess;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class VisitorRepository {
  public record Visitor(
      UUID id,
      String email,
      Instant firstVerifiedAt,
      Instant lastVerifiedAt,
      int verifyCount) {}

  private final JdbcTemplate db;

  public VisitorRepository(JdbcTemplate db) {
    this.db = db;
  }

  public void upsert(String email, byte[] ipHash) {
    db.update(
        "INSERT INTO resume_visitor(id,email,last_ip_hash) VALUES (?,?,?) ON CONFLICT(email) DO"
            + " UPDATE SET last_verified_at=now(), verify_count=resume_visitor.verify_count+1,"
            + " last_ip_hash=EXCLUDED.last_ip_hash",
        UUID.randomUUID(),
        email,
        ipHash);
  }

  public List<Visitor> page(int page, int size) {
    return db.query(
        "SELECT id,email,first_verified_at,last_verified_at,verify_count FROM resume_visitor"
            + " ORDER BY last_verified_at DESC, id LIMIT ? OFFSET ?",
        (rs, n) ->
            new Visitor(
                rs.getObject("id", UUID.class),
                rs.getString("email"),
                rs.getTimestamp("first_verified_at").toInstant(),
                rs.getTimestamp("last_verified_at").toInstant(),
                rs.getInt("verify_count")),
        size,
        (long) page * size);
  }

  public int count() {
    return db.queryForObject("SELECT count(*) FROM resume_visitor", Integer.class);
  }

  public boolean delete(UUID id) {
    return db.update("DELETE FROM resume_visitor WHERE id=?", id) == 1;
  }
}
