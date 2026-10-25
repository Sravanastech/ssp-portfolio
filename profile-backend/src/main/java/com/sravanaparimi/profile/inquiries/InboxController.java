package com.sravanaparimi.profile.inquiries;

import com.sravanaparimi.profile.accounts.AdminAuthorization;
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
  private final AdminAuthorization admin;

  public InboxController(JdbcTemplate db, AdminAuthorization admin) {
    this.db = db;
    this.admin = admin;
  }

  @GetMapping
  public ResponseEntity<List<Map<String, Object>>> list(
      @AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "0") int page) {
    admin.require(jwt);
    if (page < 0 || page > 10000) throw new IllegalArgumentException();
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            db.queryForList(
                "SELECT i.id,i.name,i.email,i.phone,i.message,i.archived,i.created_at,o.status AS"
                    + " delivery FROM inquiries i JOIN outbox o ON o.inquiry_id=i.id ORDER BY"
                    + " i.created_at DESC LIMIT 25 OFFSET ?",
                page * 25));
  }

  @PatchMapping("/{id}/archive")
  public ResponseEntity<Void> archive(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
    var actor = admin.require(jwt);
    db.update("UPDATE inquiries SET archived=true WHERE id=?", id);
    db.update(
        "INSERT INTO audit_events(actor,action,resource) VALUES (?,'inquiry.archive',?)",
        actor,
        id.toString());
    return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
  }
}
