package com.sravanaparimi.profile.studio;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.UUID;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * One-time import behind Flyway V16: the content currently published in {@code site_state} becomes
 * published blocks (draft empty), each with revision 1. Runs on the migration's own connection.
 */
public final class ContentBlockImporter {
  private ContentBlockImporter() {}

  /** Returns how many blocks were created; 0 if blocks already exist or nothing is published. */
  public static int importPublished(Connection c) throws SQLException {
    try (var st = c.createStatement();
        var rs = st.executeQuery("SELECT count(*) FROM content_block")) {
      rs.next();
      if (rs.getLong(1) > 0) return 0;
    }
    String content;
    try (var st = c.createStatement();
        var rs =
            st.executeQuery(
                "SELECT r.content::text FROM content_revision r JOIN site_state s"
                    + " ON s.revision_id = r.id")) {
      if (!rs.next()) return 0;
      content = rs.getString(1);
    }
    var json = JsonMapper.builder().build();
    JsonNode doc = json.readTree(content);
    var parts = new BlockSplitter(new SchemaRegistry(json)).split(doc);
    try (var block =
            c.prepareStatement(
                "INSERT INTO content_block(id,type,collection,slug,position,published,published_at)"
                    + " VALUES (?,?,?,?,?,?::jsonb,now())");
        var revision =
            c.prepareStatement(
                "INSERT INTO content_block_revision(block_id,rev,data) VALUES (?,1,?::jsonb)")) {
      for (var p : parts) {
        UUID id = UUID.randomUUID();
        String data = json.writeValueAsString(p.data());
        block.setObject(1, id);
        block.setString(2, p.type());
        block.setString(3, p.collection());
        block.setString(4, p.slug());
        block.setInt(5, p.position());
        block.setString(6, data);
        block.addBatch();
        revision.setObject(1, id);
        revision.setString(2, data);
        revision.addBatch();
      }
      block.executeBatch();
      revision.executeBatch();
    }
    return parts.size();
  }
}
