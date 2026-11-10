package com.sravanaparimi.profile.resumeaccess;

import static org.junit.jupiter.api.Assertions.*;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** V12 keeps Supabase-style Data API roles away from the OTP tables, on any Postgres. */
class ResumeOtpLockdownMigrationTest {
  static final List<String> TABLES = List.of("resume_otp_challenge", "resume_visitor");
  static final List<String> PRIVILEGES = List.of("SELECT", "INSERT", "UPDATE", "DELETE");

  @SuppressWarnings("resource") // stopped in each test
  static PostgreSQLContainer container(String name) {
    return new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName(name);
  }

  static DriverManagerDataSource as(PostgreSQLContainer db, String user, String password) {
    return new DriverManagerDataSource(db.getJdbcUrl(), user, password);
  }

  /** Migrates as a non-superuser table owner, like the application's own database user. */
  static DriverManagerDataSource migrateAsOwner(PostgreSQLContainer db, String target) {
    var admin = new JdbcTemplate(as(db, db.getUsername(), db.getPassword()));
    admin.execute("CREATE ROLE app_owner LOGIN PASSWORD 'owner-pw'");
    admin.execute("GRANT ALL ON SCHEMA public TO app_owner");
    var owner = as(db, "app_owner", "owner-pw");
    var flyway = Flyway.configure().dataSource(owner);
    if (target != null) flyway.target(target);
    flyway.load().migrate();
    return owner;
  }

  @Test
  void rowLevelSecurityIsEnabledAndOwnerKeepsAccessWithoutSupabaseRoles() {
    try (var db = container("test_lockdown_plain")) {
      db.start();
      var owner = migrateAsOwner(db, null);
      var sql = new JdbcTemplate(owner);
      for (String table : TABLES) {
        assertTrue(
            sql.queryForObject(
                "SELECT relrowsecurity FROM pg_class WHERE relname=?", Boolean.class, table),
            table);
        assertFalse(
            sql.queryForObject(
                "SELECT relforcerowsecurity FROM pg_class WHERE relname=?", Boolean.class, table),
            "FORCE must stay off so the owner keeps access");
      }
      assertEquals(
          0, sql.queryForObject("SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated')", Integer.class));
    }
  }

  @Test
  void supabaseRolesLoseAllPrivilegesWhileTheOwnerStillWorks() throws Exception {
    try (var db = container("test_lockdown_roles")) {
      db.start();
      var admin = new JdbcTemplate(as(db, db.getUsername(), db.getPassword()));
      var owner = migrateAsOwner(db, "11");
      // Simulate Supabase: the Data API roles exist and were granted access to public tables.
      admin.execute("CREATE ROLE anon NOLOGIN");
      admin.execute("CREATE ROLE authenticated NOLOGIN");
      admin.execute("GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated");
      for (String table : TABLES)
        assertTrue(
            admin.queryForObject("SELECT has_table_privilege('anon', ?, 'SELECT')", Boolean.class, table),
            "precondition: anon starts with access to " + table);
      Flyway.configure().dataSource(owner).load().migrate();

      for (String table : TABLES) {
        assertTrue(
            admin.queryForObject(
                "SELECT relrowsecurity FROM pg_class WHERE relname=?", Boolean.class, table));
        for (String role : List.of("anon", "authenticated", "public"))
          for (String privilege : PRIVILEGES)
            assertFalse(
                admin.queryForObject(
                    "SELECT has_table_privilege(?, ?, ?)", Boolean.class, role, table, privilege),
                role + " " + privilege + " " + table);
      }
      // A session acting as anon is refused outright.
      try (Connection c = as(db, db.getUsername(), db.getPassword()).getConnection();
          var st = c.createStatement()) {
        st.execute("SET ROLE anon");
        assertThrows(SQLException.class, () -> st.executeQuery("SELECT count(*) FROM resume_visitor"));
        assertThrows(SQLException.class, () -> st.executeQuery("SELECT count(*) FROM resume_otp_challenge"));
      }
      // The owner (the application's role) still reads and writes both tables.
      var app = new JdbcTemplate(owner);
      app.update(
          "INSERT INTO resume_visitor(id,email) VALUES (?,?)", UUID.randomUUID(), "a@x.com");
      assertEquals(1, app.queryForObject("SELECT count(*) FROM resume_visitor", Integer.class));
      app.update(
          "INSERT INTO resume_otp_challenge(id,email,code_hmac,ip_hash,expires_at) VALUES"
              + " (?,?,?,?,now() + interval '10 minutes')",
          UUID.randomUUID(), "a@x.com", new byte[] {1}, new byte[] {2});
      assertEquals(1, app.queryForObject("SELECT count(*) FROM resume_otp_challenge", Integer.class));
    }
  }

  /** Dev compose and some deployments migrate as one role and run the app as another. */
  @Test
  void splitMigratorAndRuntimeRolesKeepWorkingAndDataApiRolesStayBlockedEvenIfRegranted()
      throws Exception {
    try (var db = container("test_lockdown_split")) {
      db.start();
      var admin = new JdbcTemplate(as(db, db.getUsername(), db.getPassword()));
      admin.execute("CREATE ROLE anon NOLOGIN");
      admin.execute("CREATE ROLE authenticated NOLOGIN");
      var owner = migrateAsOwner(db, null);
      admin.execute("CREATE ROLE app_runtime LOGIN PASSWORD 'runtime-pw'");
      admin.execute("GRANT USAGE ON SCHEMA public TO app_runtime");
      admin.execute(
          "GRANT SELECT, INSERT, UPDATE, DELETE ON resume_visitor, resume_otp_challenge TO app_runtime");
      var runtime = new JdbcTemplate(as(db, "app_runtime", "runtime-pw"));
      runtime.update(
          "INSERT INTO resume_visitor(id,email) VALUES (?,?)", UUID.randomUUID(), "a@x.com");
      assertEquals(1, runtime.queryForObject("SELECT count(*) FROM resume_visitor", Integer.class));
      runtime.update(
          "INSERT INTO resume_otp_challenge(id,email,code_hmac,ip_hash,expires_at) VALUES"
              + " (?,?,?,?,now() + interval '10 minutes')",
          UUID.randomUUID(), "a@x.com", new byte[] {1}, new byte[] {2});
      assertEquals(
          1, runtime.queryForObject("SELECT count(*) FROM resume_otp_challenge", Integer.class));
      assertEquals(1, new JdbcTemplate(owner).queryForObject("SELECT count(*) FROM resume_visitor", Integer.class));

      // Someone later re-grants the Data API roles (e.g. Supabase default privileges): rows stay hidden.
      admin.execute("GRANT ALL ON resume_visitor, resume_otp_challenge TO anon, authenticated");
      try (Connection c = as(db, db.getUsername(), db.getPassword()).getConnection();
          var st = c.createStatement()) {
        for (String role : List.of("anon", "authenticated")) {
          st.execute("SET ROLE " + role);
          for (String table : TABLES) {
            try (var rs = st.executeQuery("SELECT count(*) FROM " + table)) {
              rs.next();
              assertEquals(0, rs.getInt(1), role + " must see no rows of " + table);
            }
          }
          assertThrows(
              SQLException.class,
              () ->
                  st.execute(
                      "INSERT INTO resume_visitor(id,email) VALUES (gen_random_uuid(),'evil@x.com')"));
          st.execute("RESET ROLE");
        }
      }
    }
  }
}
