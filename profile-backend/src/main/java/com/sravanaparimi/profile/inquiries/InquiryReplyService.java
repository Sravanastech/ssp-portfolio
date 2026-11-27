package com.sravanaparimi.profile.inquiries;

import com.sravanaparimi.profile.accounts.Actor;
import com.sravanaparimi.profile.accounts.AuthzException;
import com.sravanaparimi.profile.audit.AuditLog;
import com.sravanaparimi.profile.platform.EmailGateway;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Owner replies to inquiries. Deliberately not transactional: each statement commits on its own
 * so the outbound email is never sent while a DB transaction is open. Never logs or audits the
 * recipient address or the reply body.
 */
@Service
public class InquiryReplyService {
  static final int MAX_BODY = 5000;
  static final int HOURLY_LIMIT = 20;

  public record Created(UUID id, String status, Instant createdAt) {}

  public record ReplyView(
      UUID id, String authorName, String body, String status, Instant createdAt) {}

  private record Target(String name, String email, String message) {}

  private final JdbcTemplate db;
  private final EmailGateway email;
  private final AuditLog audit;

  public InquiryReplyService(JdbcTemplate db, EmailGateway email, AuditLog audit) {
    this.db = db;
    this.email = email;
    this.audit = audit;
  }

  public List<ReplyView> list(UUID inquiryId) {
    return db.query(
        "SELECT r.id, r.body, r.status, r.created_at,"
            + " trim(coalesce(a.first_name,'')||' '||coalesce(a.last_name,'')) AS author"
            + " FROM inquiry_replies r JOIN accounts a ON a.id = r.author_id"
            + " WHERE r.inquiry_id=? ORDER BY r.created_at, r.id",
        (rs, n) ->
            new ReplyView(
                rs.getObject("id", UUID.class),
                rs.getString("author"),
                rs.getString("body"),
                rs.getString("status"),
                rs.getTimestamp("created_at").toInstant()),
        inquiryId);
  }

  public Created reply(Actor actor, UUID inquiryId, String rawBody) {
    Target target = find(inquiryId);
    if (target.email() == null || target.email().isBlank()) throw AuthzException.noEmail();
    String body = rawBody == null ? "" : rawBody.strip();
    if (body.isEmpty() || body.length() > MAX_BODY) throw new IllegalArgumentException();
    Integer recent =
        db.queryForObject(
            "SELECT count(*) FROM inquiry_replies WHERE author_id=?"
                + " AND created_at > now() - interval '1 hour'",
            Integer.class,
            actor.accountId());
    if (recent != null && recent >= HOURLY_LIMIT) throw AuthzException.replyRateLimited();

    UUID replyId = UUID.randomUUID();
    Instant createdAt =
        db.queryForObject(
            "INSERT INTO inquiry_replies(id,inquiry_id,author_id,body,status)"
                + " VALUES (?,?,?,?,'sending') RETURNING created_at",
            java.sql.Timestamp.class,
            replyId,
            inquiryId,
            actor.accountId(),
            body)
            .toInstant();

    String status;
    try {
      email.sendReply(replyId, target.email().strip(), target.name(), target.message(), body);
      status = "sent";
      db.update("UPDATE inquiry_replies SET status='sent' WHERE id=?", replyId);
      db.update("UPDATE inquiries SET replied_at=now() WHERE id=?", inquiryId);
    } catch (Exception e) {
      status = "failed";
      String error = e.getClass().getSimpleName();
      db.update(
          "UPDATE inquiry_replies SET status='failed', error=? WHERE id=?",
          error.length() > 128 ? error.substring(0, 128) : error,
          replyId);
    }
    audit.record(
        actor.accountId(),
        "inquiry.reply",
        inquiryId.toString(),
        Map.of("replyId", replyId.toString(), "status", status));
    if (status.equals("failed")) throw AuthzException.emailFailed();
    return new Created(replyId, status, createdAt);
  }

  private Target find(UUID inquiryId) {
    var rows =
        db.query(
            "SELECT name,email,message FROM inquiries WHERE id=? AND NOT archived",
            (rs, n) ->
                new Target(rs.getString("name"), rs.getString("email"), rs.getString("message")),
            inquiryId);
    if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    return rows.getFirst();
  }
}
