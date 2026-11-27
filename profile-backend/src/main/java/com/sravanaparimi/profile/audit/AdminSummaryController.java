package com.sravanaparimi.profile.audit;

import com.sravanaparimi.profile.accounts.Authz;
import com.sravanaparimi.profile.accounts.Permission;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Dashboard counts. Any admin role may call; each field appears only with its permission. */
@RestController
@RequestMapping("/api/admin/summary")
public class AdminSummaryController {
  private final JdbcTemplate db;
  private final Authz authz;

  public AdminSummaryController(JdbcTemplate db, Authz authz) {
    this.db = db;
    this.authz = authz;
  }

  @GetMapping
  public ResponseEntity<Map<String, Object>> summary(@AuthenticationPrincipal Jwt jwt) {
    var actor = authz.resolve(jwt);
    var out = new LinkedHashMap<String, Object>();
    if (actor.can(Permission.INQUIRIES_MANAGE))
      out.put(
          "openInquiries",
          db.queryForObject(
              "SELECT count(*) FROM inquiries WHERE NOT archived AND replied_at IS NULL",
              Integer.class));
    if (actor.can(Permission.CONTENT_EDIT))
      out.put(
          "draftPending",
          db.queryForObject(
              "SELECT EXISTS (SELECT 1 FROM content_block WHERE draft IS NOT NULL"
                  + " OR draft_deleted OR draft_position IS NOT NULL)",
              Boolean.class));
    if (actor.can(Permission.PEOPLE_READ))
      out.put(
          "newResumeVisitors7d",
          db.queryForObject(
              "SELECT count(*) FROM resume_visitor"
                  + " WHERE first_verified_at > now() - interval '7 days'",
              Integer.class));
    if (actor.can(Permission.AUDIT_READ))
      out.put(
          "deniedEvents7d",
          db.queryForObject(
              "SELECT count(*) FROM audit_events WHERE outcome='denied'"
                  + " AND created_at > now() - interval '7 days'",
              Integer.class));
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(out);
  }
}
