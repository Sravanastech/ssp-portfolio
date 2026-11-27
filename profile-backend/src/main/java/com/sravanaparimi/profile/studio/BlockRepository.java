package com.sravanaparimi.profile.studio;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** All SQL for content_block and content_block_revision. Callers own the transaction. */
@Repository
public class BlockRepository {
  public record Revision(int rev, JsonNode data, UUID createdBy, java.time.Instant createdAt) {}

  static final int KEEP_REVISIONS = 3;
  private static final String COLS =
      "id,type,collection,slug,position,draft_position,draft::text AS draft,"
          + "published::text AS published,draft_deleted,version,updated_at,published_at";
  private static final String PENDING =
      "(draft IS NOT NULL OR draft_deleted OR draft_position IS NOT NULL)";

  private final JdbcTemplate db;
  private final JsonMapper json;

  public BlockRepository(JdbcTemplate db, JsonMapper json) {
    this.db = db;
    this.json = json;
  }

  private static String marks(Collection<?> ids) {
    return String.join(",", Collections.nCopies(ids.size(), "?"));
  }

  private JsonNode node(String s) {
    return s == null ? null : json.readTree(s);
  }

  private Block map(ResultSet rs, int n) throws SQLException {
    int draftPosition = rs.getInt("draft_position");
    boolean noDraftPosition = rs.wasNull();
    return new Block(
        rs.getObject("id", UUID.class),
        rs.getString("type"),
        rs.getString("collection"),
        rs.getString("slug"),
        rs.getInt("position"),
        noDraftPosition ? null : draftPosition,
        node(rs.getString("draft")),
        node(rs.getString("published")),
        rs.getBoolean("draft_deleted"),
        rs.getLong("version"),
        rs.getTimestamp("updated_at").toInstant(),
        rs.getTimestamp("published_at") == null
            ? null
            : rs.getTimestamp("published_at").toInstant());
  }

  public List<Block> all() {
    return db.query(
        "SELECT " + COLS + " FROM content_block ORDER BY type, position, slug", this::map);
  }

  public Optional<Block> find(UUID id) {
    return db.query("SELECT " + COLS + " FROM content_block WHERE id=?", this::map, id).stream()
        .findFirst();
  }

  public Map<UUID, Block> lock(Collection<UUID> ids) {
    var out = new LinkedHashMap<UUID, Block>();
    if (ids.isEmpty()) return out;
    db.query(
            "SELECT "
                + COLS
                + " FROM content_block WHERE id IN ("
                + marks(ids)
                + ") ORDER BY id FOR UPDATE",
            this::map,
            ids.toArray())
        .forEach(b -> out.put(b.id(), b));
    return out;
  }

  public List<Block> lockPending() {
    return db.query(
        "SELECT " + COLS + " FROM content_block WHERE " + PENDING + " ORDER BY id FOR UPDATE",
        this::map);
  }

  public List<Block> byIds(Collection<UUID> ids) {
    if (ids.isEmpty()) return List.of();
    return db.query(
        "SELECT "
            + COLS
            + " FROM content_block WHERE id IN ("
            + marks(ids)
            + ") ORDER BY type, position, slug",
        this::map,
        ids.toArray());
  }

  public int pendingCount() {
    return db.queryForObject("SELECT count(*) FROM content_block WHERE " + PENDING, Integer.class);
  }

  public boolean anyPending() {
    return Boolean.TRUE.equals(
        db.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM content_block WHERE " + PENDING + ")", Boolean.class));
  }

  public Set<String> slugs(String type) {
    return new HashSet<>(db.queryForList("SELECT slug FROM content_block WHERE type=?", String.class, type));
  }

  public int nextPosition(String type) {
    return db.queryForObject(
        "SELECT coalesce(max(coalesce(draft_position, position)), -1) + 1 FROM content_block"
            + " WHERE type=?",
        Integer.class,
        type);
  }

  public void insert(Block b, JsonNode draft, UUID actor) {
    db.update(
        "INSERT INTO content_block(id,type,collection,slug,position,draft,updated_by)"
            + " VALUES (?,?,?,?,?,?::jsonb,?)",
        b.id(),
        b.type(),
        b.collection(),
        b.slug(),
        b.position(),
        json.writeValueAsString(draft),
        actor);
  }

  /** Replace the unpublished state of a block and bump its version. */
  public void saveDraftState(
      UUID id, JsonNode draft, Integer draftPosition, boolean draftDeleted, UUID actor) {
    db.update(
        "UPDATE content_block SET draft=?::jsonb, draft_position=?, draft_deleted=?,"
            + " version=version+1, updated_by=?, updated_at=now() WHERE id=?",
        draft == null ? null : json.writeValueAsString(draft),
        draftPosition,
        draftDeleted,
        actor,
        id);
  }

  /** Never-published blocks hold only a draft; removing the draft removes the block. */
  public void setPositionDirect(UUID id, int position) {
    db.update("UPDATE content_block SET position=? WHERE id=?", position, id);
  }

  public void delete(UUID id) {
    db.update("DELETE FROM content_block WHERE id=?", id);
  }

  /** Makes the draft live; records a revision when the content changed; prunes to 3. */
  public void publish(Block b, UUID actor) {
    JsonNode data = b.draft() != null ? b.draft() : b.published();
    int position = b.effectivePosition();
    db.update(
        "UPDATE content_block SET published=?::jsonb, position=?, draft=NULL, draft_position=NULL,"
            + " draft_deleted=false, version=version+1, published_at=now(), updated_by=?,"
            + " updated_at=now() WHERE id=?",
        json.writeValueAsString(data),
        position,
        actor,
        b.id());
    if (b.draft() == null) return;
    db.update(
        "INSERT INTO content_block_revision(block_id,rev,data,created_by)"
            + " SELECT ?, coalesce(max(rev),0)+1, ?::jsonb, ? FROM content_block_revision"
            + " WHERE block_id=?",
        b.id(),
        json.writeValueAsString(data),
        actor,
        b.id());
    db.update(
        "DELETE FROM content_block_revision WHERE block_id=? AND rev <="
            + " (SELECT max(rev) FROM content_block_revision WHERE block_id=?) - ?",
        b.id(),
        b.id(),
        KEEP_REVISIONS);
  }

  public List<Revision> revisions(UUID id) {
    return db.query(
        "SELECT rev,data::text,created_by,created_at FROM content_block_revision"
            + " WHERE block_id=? ORDER BY rev DESC LIMIT ?",
        (rs, n) ->
            new Revision(
                rs.getInt(1),
                json.readTree(rs.getString(2)),
                rs.getObject(3, UUID.class),
                rs.getTimestamp(4).toInstant()),
        id,
        KEEP_REVISIONS);
  }

  public Optional<Revision> revision(UUID id, int rev) {
    return revisions(id).stream().filter(r -> r.rev() == rev).findFirst();
  }
}
