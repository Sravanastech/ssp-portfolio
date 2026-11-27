package com.sravanaparimi.profile.accounts;

import static org.junit.jupiter.api.Assertions.*;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;

class InquiryRepliesMigrationTest {
  @Test
  void addsRepliesTableConstraintsAndRlsLockdown() {
    try (var pg = new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("rep_mig")) {
      pg.start();
      var ds = new DriverManagerDataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword());
      Flyway.configure().dataSource(ds).load().migrate();
      var db = new JdbcTemplate(ds);
      UUID acct = UUID.randomUUID(), inq = UUID.randomUUID();
      db.update("INSERT INTO accounts(id,issuer,subject) VALUES (?,'iss','o')", acct);
      db.update(
          "INSERT INTO inquiries(id,idempotency_key,payload_hash,name,message)"
              + " VALUES (?,'k','h','n','m')",
          inq);
      assertNull(
          db.queryForObject(
              "SELECT replied_at FROM inquiries WHERE id=?", java.sql.Timestamp.class, inq));
      String insert =
          "INSERT INTO inquiry_replies(id,inquiry_id,author_id,body,status) VALUES (?,?,?,'b',?)";
      db.update(insert, UUID.randomUUID(), inq, acct, "sending");
      assertThrows(
          DataIntegrityViolationException.class,
          () -> db.update(insert, UUID.randomUUID(), inq, acct, "bogus"));
      for (String t : new String[] {"inquiry_replies", "inquiries", "outbox", "contact_limits"}) {
        assertEquals(
            Boolean.TRUE,
            db.queryForObject(
                "SELECT relrowsecurity FROM pg_class WHERE relname=?", Boolean.class, t),
            t);
        assertEquals(
            1,
            db.queryForObject(
                "SELECT count(*) FROM pg_policies WHERE tablename=? AND policyname=?",
                Integer.class,
                t,
                t + "_not_data_api"),
            t);
      }
    }
  }
}
