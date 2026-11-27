package com.sravanaparimi.profile.studio;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/releases")
public class ReleaseController {
  public record PublishRequest(@Size(max = 200) String note) {}

  private final ReleaseService service;

  public ReleaseController(ReleaseService service) {
    this.service = service;
  }

  @PostMapping
  public ResponseEntity<ReleaseService.ReleaseView> publish(
      @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody(required = false) PublishRequest request) {
    var note = request == null || request.note() == null || request.note().isBlank() ? null : request.note().strip();
    return ResponseEntity.status(201)
        .cacheControl(CacheControl.noStore())
        .body(service.publish(jwt, note));
  }

  @GetMapping
  public ResponseEntity<List<ReleaseService.ReleaseView>> list(@AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(jwt));
  }

  @PostMapping("/{id}/rollback")
  public ResponseEntity<ReleaseService.ReleaseView> rollback(
      @AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
    return ResponseEntity.status(201)
        .cacheControl(CacheControl.noStore())
        .body(service.rollback(jwt, id));
  }
}
