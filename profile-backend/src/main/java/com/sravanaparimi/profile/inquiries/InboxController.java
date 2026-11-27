package com.sravanaparimi.profile.inquiries;

import com.sravanaparimi.profile.accounts.Authz;
import com.sravanaparimi.profile.accounts.Permission;
import com.sravanaparimi.profile.audit.AuditLog;
import java.util.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/inquiries")
public class InboxController {
  private final JdbcTemplate db;
  private final Authz authz;
  private final AuditLog audit;

  public InboxController(JdbcTemplate db, Authz authz, AuditLog audit) {
    this.db = db;
    this.authz = authz;
    this.audit = audit;
  }

  @GetMapping
  public ResponseEntity<List<Map<String, Object>>> list(
      @AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "0") int page) {
    authz.require(jwt, Permission.INQUIRIES_MANAGE);
    if (page < 0 || page > 10000) throw new IllegalArgumentException();
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            db.queryForList(
                "SELECT i.id,i.name,i.email,i.phone,i.message,i.archived,i.created_at,"
                    + " i.replied_at,(SELECT count(*) FROM inquiry_replies r WHERE"
                    + " r.inquiry_id=i.id) AS reply_count,o.status AS delivery FROM inquiries i JOIN outbox o ON o.inquiry_id=i.id ORDER BY"
                    + " i.created_at DESC LIMIT 25 OFFSET ?",
                page * 25));
  }

  @PatchMapping("/{id}/archive")
  public ResponseEntity<Void> archive(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
    var actor = authz.require(jwt, Permission.INQUIRIES_MANAGE).accountId();
    db.update("UPDATE inquiries SET archived=true WHERE id=?", id);
    audit.record(actor, "inquiry.archive", id.toString());
    return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
  }
}
