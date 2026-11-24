package com.sravanaparimi.profile.accounts;

import static org.junit.jupiter.api.Assertions.*;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;

class TeamMigrationTest {
  @Test
  void backfillsOwnerAndEnforcesRoleValuesAndOneOpenInvitePerEmail() {
    try (var pg = new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName("team_mig")) {
      pg.start();
      var ds = new DriverManagerDataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword());
      Flyway.configure().dataSource(ds).target("12").load().migrate();
      var db = new JdbcTemplate(ds);
      UUID owner = UUID.randomUUID(), visitor = UUID.randomUUID();
      db.update("INSERT INTO accounts(id,issuer,subject,is_admin) VALUES (?,'iss','o',true)", owner);
      db.update("INSERT INTO accounts(id,issuer,subject) VALUES (?,'iss','v')", visitor);

      Flyway.configure().dataSource(ds).load().migrate();

      assertEquals("owner", db.queryForObject("SELECT role FROM accounts WHERE id=?", String.class, owner));
      assertNotNull(db.queryForObject("SELECT role_granted_at FROM accounts WHERE id=?", java.sql.Timestamp.class, owner));
      assertNull(db.queryForObject("SELECT role FROM accounts WHERE id=?", String.class, visitor));
      assertThrows(DataIntegrityViolationException.class,
          () -> db.update("UPDATE accounts SET role='superuser' WHERE id=?", visitor));

      String insert = "INSERT INTO invites(id,email,token_hash,created_by,expires_at)"
          + " VALUES (?,'a@x.com',?,?,now()+interval '7 days')";
      db.update(insert, UUID.randomUUID(), new byte[] {1}, owner);
      assertThrows(DataIntegrityViolationException.class,
          () -> db.update(insert, UUID.randomUUID(), new byte[] {2}, owner));
      db.update("UPDATE invites SET revoked_at=now()");
      db.update(insert, UUID.randomUUID(), new byte[] {3}, owner); // allowed after revoke

      assertEquals("ok", db.queryForObject(
          "INSERT INTO audit_events(action,resource) VALUES ('t','r') RETURNING outcome", String.class));
    }
  }
}
