package com.sravanaparimi.profile.audit;

import com.sravanaparimi.profile.accounts.Authz;
import com.sravanaparimi.profile.accounts.Permission;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
public class AuditController {
  private final Authz authz;
  private final AuditLog audit;

  public AuditController(Authz authz, AuditLog audit) {
    this.authz = authz;
    this.audit = audit;
  }

  @GetMapping("/api/admin/audit")
  public ResponseEntity<AuditLog.Page> page(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(required = false) Long before,
      @RequestParam(required = false) String action,
      @RequestParam(required = false) UUID actor,
      @RequestParam(defaultValue = "50") int limit) {
    authz.require(jwt, Permission.AUDIT_READ);
    if (action != null && !action.matches("^[a-z_.]{1,80}$"))
      throw new IllegalArgumentException("action");
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(audit.page(before, action, actor, limit));
  }
}
