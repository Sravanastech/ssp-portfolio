package com.sravanaparimi.profile.resumeaccess;

import com.sravanaparimi.profile.accounts.Authz;
import com.sravanaparimi.profile.accounts.Permission;
import com.sravanaparimi.profile.audit.AuditLog;
import java.util.List;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Owner-only visitor list. Emails are never written to the audit log, only row ids. */
@RestController
@RequestMapping(path = "/api/admin/resume-visitors", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminVisitorController {
  static final int DEFAULT_SIZE = 25;
  static final int MAX_SIZE = 100;
  static final int MAX_PAGE = 100_000;

  public record Page(List<VisitorRepository.Visitor> items, int page, int size, int total) {}

  private final VisitorRepository visitors;
  private final Authz authz;
  private final AuditLog audit;

  public AdminVisitorController(
      VisitorRepository visitors, Authz authz, AuditLog audit) {
    this.visitors = visitors;
    this.authz = authz;
    this.audit = audit;
  }

  @GetMapping
  public ResponseEntity<Page> list(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "" + DEFAULT_SIZE) int size) {
    var actor = authz.require(jwt, Permission.PEOPLE_READ).accountId();
    if (page < 0 || page > MAX_PAGE || size < 1) throw new IllegalArgumentException();
    int capped = Math.min(size, MAX_SIZE);
    audit.record(actor, "resume_visitor.list", "resume-visitors");
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(new Page(visitors.page(page, capped), page, capped, visitors.count()));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
    var actor = authz.require(jwt, Permission.PEOPLE_MANAGE).accountId();
    if (!visitors.delete(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
    audit.record(actor, "resume_visitor.delete", id.toString());
    return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
  }
}
