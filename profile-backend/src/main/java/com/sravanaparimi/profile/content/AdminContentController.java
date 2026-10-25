package com.sravanaparimi.profile.content;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/drafts")
public class AdminContentController {
  public record Edit(@Min(1) long version, @NotNull Map<String, Object> content) {}

  private final ContentEditorService service;

  public AdminContentController(ContentEditorService service) {
    this.service = service;
  }

  @GetMapping
  public ResponseEntity<List<ContentEditorService.DraftDto>> list(
      @AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(jwt));
  }

  @PostMapping
  public ResponseEntity<ContentEditorService.DraftDto> create(@AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.status(201)
        .cacheControl(CacheControl.noStore())
        .body(service.create(jwt));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ContentEditorService.DraftDto> save(
      @AuthenticationPrincipal Jwt jwt, @PathVariable long id, @Valid @RequestBody Edit edit) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(service.save(jwt, id, edit.version(), edit.content()));
  }
}
