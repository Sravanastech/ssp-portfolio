package com.sravanaparimi.profile.studio;

import static org.junit.jupiter.api.Assertions.*;

import java.io.InputStream;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** V15 creates and locks down the block tables; V16 imports what is published today. */
class ContentBlocksMigrationTest {
  static final JsonMapper JSON = JsonMapper.builder().build();
  static final List<String> TABLES = List.of("content_block", "content_block_revision", "site_release");
  final SchemaRegistry registry = new SchemaRegistry(JSON);
  final SnapshotAssembler assembler = new SnapshotAssembler(registry, JSON);

  @SuppressWarnings("resource") // stopped in each test
  static PostgreSQLContainer container(String name) {
    return new PostgreSQLContainer("postgres:17.11-alpine").withDatabaseName(name);
  }

  JsonNode assembledFromBlocks(JdbcTemplate sql) {
    var parts =
        sql.query(
            "SELECT type, collection, slug, position, published::text FROM content_block",
            (rs, n) ->
                new BlockPart(
                    rs.getString(1),
                    rs.getString(2),
                    rs.getString(3),
                    rs.getInt(4),
                    JSON.readTree(rs.getString(5))));
    return assembler.assemble(parts);
  }

  @Test
  void importedBlocksAssembleToExactlyTheCurrentlyPublishedContent() throws Exception {
    try (var db = container("test_blocks_import")) {
      db.start();
      var ds = new DriverManagerDataSource(db.getJdbcUrl(), db.getUsername(), db.getPassword());
      var sql = new JdbcTemplate(ds);
      Flyway.configure().dataSource(ds).target("14").load().migrate();
      // Production content may have been edited since V1: the live revision must win.
      sql.update(
          "UPDATE content_revision SET content = jsonb_set(content, '{profile,name}',"
              + " '\"Edited Name\"') WHERE id = (SELECT revision_id FROM site_state)");
      var live =
          JSON.readTree(
              sql.queryForObject(
                  "SELECT content::text FROM content_revision WHERE id="
                      + "(SELECT revision_id FROM site_state)",
                  String.class));

      Flyway.configure().dataSource(ds).load().migrate();

      assertEquals("Edited Name", live.at("/profile/name").asString());
      assertEquals(live, assembledFromBlocks(sql));
      assertEquals(
          0,
          sql.queryForObject(
              "SELECT count(*) FROM content_block WHERE draft IS NOT NULL OR draft_deleted"
                  + " OR published IS NULL",
              Integer.class));
      int blocks = sql.queryForObject("SELECT count(*) FROM content_block", Integer.class);
      assertEquals(
          blocks,
          sql.queryForObject(
              "SELECT count(*) FROM content_block_revision WHERE rev=1", Integer.class));
    }
  }

  @Test
  void untouchedProductionContentEqualsTheBundledStaticContent() throws Exception {
    try (var db = container("test_blocks_static");
        InputStream seed = getClass().getResourceAsStream("/seed/portfolio.json")) {
      db.start();
      var ds = new DriverManagerDataSource(db.getJdbcUrl(), db.getUsername(), db.getPassword());
      Flyway.configure().dataSource(ds).load().migrate();
      assertEquals(JSON.readTree(seed), assembledFromBlocks(new JdbcTemplate(ds)));
    }
  }

  @Test
  void blockTablesAreLockedDownForDataApiRolesWhileTheOwnerStillWorks() throws Exception {
    try (var db = container("test_blocks_lockdown")) {
      db.start();
      var admin = new JdbcTemplate(new DriverManagerDataSource(db.getJdbcUrl(), db.getUsername(), db.getPassword()));
      admin.execute("CREATE ROLE anon NOLOGIN");
      admin.execute("CREATE ROLE authenticated NOLOGIN");
      admin.execute("CREATE ROLE app_owner LOGIN PASSWORD 'owner-pw'");
      admin.execute("GRANT ALL ON SCHEMA public TO app_owner");
      var owner = new DriverManagerDataSource(db.getJdbcUrl(), "app_owner", "owner-pw");
      Flyway.configure().dataSource(owner).load().migrate();

      for (String table : TABLES) {
        assertTrue(
            admin.queryForObject(
                "SELECT relrowsecurity FROM pg_class WHERE relname=?", Boolean.class, table),
            table);
        for (String role : List.of("anon", "authenticated", "public"))
          for (String privilege : List.of("SELECT", "INSERT", "UPDATE", "DELETE"))
            assertFalse(
                admin.queryForObject(
                    "SELECT has_table_privilege(?, ?, ?)", Boolean.class, role, table, privilege),
                role + " " + privilege + " " + table);
      }
      // Even if someone re-grants the Data API roles, the policy shows them no rows.
      admin.execute("GRANT ALL ON content_block, site_release TO anon, authenticated");
      try (Connection c = new DriverManagerDataSource(db.getJdbcUrl(), db.getUsername(), db.getPassword()).getConnection();
          var st = c.createStatement()) {
        st.execute("SET ROLE anon");
        try (var rs = st.executeQuery("SELECT count(*) FROM content_block")) {
          rs.next();
          assertEquals(0, rs.getInt(1));
        }
        assertThrows(
            SQLException.class,
            () ->
                st.execute(
                    "INSERT INTO content_block(id,type,slug) VALUES (gen_random_uuid(),'x','y')"));
      }
      assertTrue(new JdbcTemplate(owner).queryForObject("SELECT count(*) FROM content_block", Integer.class) > 0);
    }
  }
}
