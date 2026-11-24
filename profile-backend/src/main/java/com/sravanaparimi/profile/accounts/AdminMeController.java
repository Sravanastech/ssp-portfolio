package com.sravanaparimi.profile.accounts;

import java.util.List;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
public class AdminMeController {
  public record Me(String role, boolean canPublish, List<String> permissions) {}

  private final Authz authz;

  public AdminMeController(Authz authz) {
    this.authz = authz;
  }

  @GetMapping("/api/admin/me")
  public ResponseEntity<Me> me(@AuthenticationPrincipal Jwt jwt) {
    Actor a = authz.resolve(jwt);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            new Me(
                a.role().db(),
                a.canPublish(),
                a.permissions().stream().map(Permission::code).sorted().toList()));
  }
}
