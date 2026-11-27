package com.sravanaparimi.profile.studio;

import com.sravanaparimi.profile.accounts.Authz;
import com.sravanaparimi.profile.accounts.Permission;
import com.sravanaparimi.profile.audit.AuditLog;
import java.time.Instant;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Publishing: drafts become published, a frozen snapshot becomes a release, the build is told. */
@Service
public class ReleaseService {
  private static final Logger log = LoggerFactory.getLogger(ReleaseService.class);
  static final int KEEP_RELEASES = 3;

  public record ReleaseView(
      long id,
      String status,
      String note,
      UUID createdBy,
      Instant createdAt,
      Instant finishedAt,
      String runUrl) {}

  private final JdbcTemplate db;
  private final TransactionTemplate tx;
  private final BlockRepository blocks;
  private final BlockValidator validator;
  private final SnapshotAssembler assembler;
  private final ReleaseDispatcher dispatcher;
  private final Authz authz;
  private final AuditLog audit;
  private final JsonMapper json;

  public ReleaseService(
      JdbcTemplate db,
      PlatformTransactionManager txManager,
      BlockRepository blocks,
      BlockValidator validator,
      SnapshotAssembler assembler,
      ReleaseDispatcher dispatcher,
      Authz authz,
      AuditLog audit,
      JsonMapper json) {
    this.db = db;
    this.tx = new TransactionTemplate(txManager);
    this.blocks = blocks;
    this.validator = validator;
    this.assembler = assembler;
    this.dispatcher = dispatcher;
    this.authz = authz;
    this.audit = audit;
    this.json = json;
  }

  public ReleaseView publish(Jwt jwt, String note) {
    var actor = authz.require(jwt, Permission.CONTENT_PUBLISH).accountId();
    long id = Objects.requireNonNull(tx.execute(s -> publishInTransaction(actor, note)));
    return dispatchAndReload(id);
  }

  private long publishInTransaction(UUID actor, String note) {
    var pending = blocks.lockPending();
    if (pending.isEmpty()) throw StudioException.nothingToPublish();
    var errors = new ArrayList<Map<String, Object>>();
    for (var b : pending) {
      if (b.draft() == null || b.draftDeleted()) continue;
      for (var v : validator.validate(b.type(), b.slug(), b.draft()))
        errors.add(
            Map.of("id", b.id(), "type", b.type(), "path", v.path(), "message", v.message()));
    }
    if (!errors.isEmpty()) throw StudioException.invalid(errors);
    var ops = new ArrayList<Map<String, Object>>();
    for (var b : pending) {
      if (b.draftDeleted()) blocks.delete(b.id());
      else blocks.publish(b, actor);
      ops.add(
          Map.of(
              "id", b.id().toString(),
              "type", b.type(),
              "op", b.draftDeleted() ? "delete" : "publish"));
    }
    long release = insertRelease(assembleLive(), note, actor);
    audit.record(
        actor,
        "release.publish",
        Long.toString(release),
        Map.of("releaseId", release, "blocks", ops));
    return release;
  }

  public List<ReleaseView> list(Jwt jwt) {
    authz.require(jwt, Permission.CONTENT_EDIT);
    return db.query(
        "SELECT id,status,note,created_by,created_at,finished_at,run_url FROM site_release"
            + " ORDER BY id DESC LIMIT ?",
        (rs, n) -> view(rs),
        KEEP_RELEASES);
  }

  /** Re-releases an older snapshot as a new release. Blocks are left as they are. */
  public ReleaseView rollback(Jwt jwt, long fromId) {
    var actor = authz.require(jwt, Permission.CONTENT_PUBLISH).accountId();
    long id =
        Objects.requireNonNull(
            tx.execute(
                s -> {
                  var snapshot =
                      db.queryForList(
                          "SELECT snapshot::text FROM site_release WHERE id=? FOR SHARE",
                          String.class,
                          fromId);
                  if (snapshot.isEmpty()) throw StudioException.notFound("Release");
                  long release =
                      insertRelease(
                          json.readTree(snapshot.getFirst()), "Rollback to release #" + fromId, actor);
                  audit.record(
                      actor,
                      "release.rollback",
                      Long.toString(release),
                      Map.of("releaseId", release, "from", fromId));
                  return release;
                }));
    return dispatchAndReload(id);
  }

  private JsonNode assembleLive() {
    return assembler.assemble(
        blocks.all().stream().filter(b -> b.published() != null).map(Block::livePart).toList());
  }

  private long insertRelease(JsonNode snapshot, String note, UUID actor) {
    long id =
        db.queryForObject(
            "INSERT INTO site_release(snapshot,status,note,created_by)"
                + " VALUES (?::jsonb,'queued',?,?) RETURNING id",
            Long.class,
            json.writeValueAsString(snapshot),
            note,
            actor);
    db.update(
        "DELETE FROM site_release WHERE id NOT IN"
            + " (SELECT id FROM site_release ORDER BY id DESC LIMIT ?)",
        KEEP_RELEASES);
    return id;
  }

  private ReleaseView dispatchAndReload(long id) {
    try {
      dispatcher.dispatch(id);
    } catch (Exception e) {
      log.warn("Release {} dispatch failed: {}", id, e.getMessage());
      db.update(
          "UPDATE site_release SET status='failed', finished_at=now() WHERE id=?", id);
    }
    return db.queryForObject(
        "SELECT id,status,note,created_by,created_at,finished_at,run_url FROM site_release"
            + " WHERE id=?",
        (rs, n) -> view(rs),
        id);
  }

  private static ReleaseView view(java.sql.ResultSet rs) throws java.sql.SQLException {
    return new ReleaseView(
        rs.getLong("id"),
        rs.getString("status"),
        rs.getString("note"),
        rs.getObject("created_by", UUID.class),
        rs.getTimestamp("created_at").toInstant(),
        rs.getTimestamp("finished_at") == null ? null : rs.getTimestamp("finished_at").toInstant(),
        rs.getString("run_url"));
  }
}
