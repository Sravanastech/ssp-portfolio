package com.sravanaparimi.profile.audit;

import com.sravanaparimi.profile.accounts.Permission;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/** Single write path for audit_events. Never pass emails or tokens in details. */
@Component
public class AuditLog {
  public record Entry(
      long id,
      Instant at,
      UUID actorId,
      String actorName,
      String action,
      String resource,
      String outcome,
      String details) {}

  public record Page(List<Entry> items, Long next) {}

  private final JdbcTemplate db;
  private final JsonMapper json;

  public AuditLog(JdbcTemplate db, JsonMapper json) {
    this.db = db;
    this.json = json;
  }

  public void record(UUID actor, String action, String resource, Map<String, Object> details) {
    db.update(
        "INSERT INTO audit_events(actor,action,resource,details,outcome) VALUES"
            + " (?,?,?,?::jsonb,'ok')",
        actor,
        action,
        resource,
        details == null ? null : json.writeValueAsString(details));
  }

  public void record(UUID actor, String action, String resource) {
    record(actor, action, resource, null);
  }

  /** Own transaction: survives the rollback of a @Transactional caller that then throws 403. */
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void denied(UUID actor, Permission permission) {
    db.update(
        "INSERT INTO audit_events(actor,action,resource,details,outcome)"
            + " VALUES (?,'access.denied','admin',?::jsonb,'denied')",
        actor,
        json.writeValueAsString(Map.of("permission", permission.code())));
  }

  public Page page(Long before, String action, UUID actor, int limit) {
    int size = Math.max(1, Math.min(limit, 100));
    var rows =
        db.query(
            "SELECT e.id, e.created_at, e.actor,"
                + " trim(coalesce(a.first_name,'')||' '||coalesce(a.last_name,'')) AS name,"
                + " e.action, e.resource, e.outcome, e.details::text AS details"
                + " FROM audit_events e LEFT JOIN accounts a ON a.id = e.actor"
                + " WHERE (?::bigint IS NULL OR e.id < ?)"
                + " AND (?::text IS NULL OR e.action = ?)"
                + " AND (?::uuid IS NULL OR e.actor = ?)"
                + " ORDER BY e.id DESC LIMIT ?",
            (rs, n) ->
                new Entry(
                    rs.getLong("id"),
                    rs.getTimestamp("created_at").toInstant(),
                    rs.getObject("actor", UUID.class),
                    rs.getString("name"),
                    rs.getString("action"),
                    rs.getString("resource"),
                    rs.getString("outcome"),
                    rs.getString("details")),
            before,
            before,
            action,
            action,
            actor,
            actor,
            size + 1);
    Long next = rows.size() > size ? rows.get(size - 1).id() : null;
    return new Page(rows.subList(0, Math.min(size, rows.size())), next);
  }
}
