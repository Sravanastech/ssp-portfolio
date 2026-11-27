package com.sravanaparimi.profile.studio;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.json.JsonMapper;

@RestController
@RequestMapping("/api/admin/studio")
public class StudioController {
  public record SaveRequest(@NotEmpty @Size(max = 200) List<StudioService.Change> changes) {}

  public record DiscardRequest(@NotEmpty @Size(max = 500) List<UUID> ids) {}

  private final StudioService service;
  private final JsonMapper json;

  public StudioController(StudioService service, JsonMapper json) {
    this.service = service;
    this.json = json;
  }

  @GetMapping
  public ResponseEntity<?> overview(
      @AuthenticationPrincipal Jwt jwt,
      @RequestHeader(value = "If-None-Match", required = false) String match)
      throws Exception {
    var body = service.overview(jwt);
    byte[] bytes = json.writeValueAsBytes(body);
    String tag = "\"studio-" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes), 0, 12) + "\"";
    var response = ResponseEntity.ok().eTag(tag).cacheControl(CacheControl.noCache());
    if (tag.equals(match)) return ResponseEntity.status(304).eTag(tag).cacheControl(CacheControl.noCache()).build();
    return response.body(body);
  }

  @PostMapping("/save")
  public ResponseEntity<StudioService.SaveResult> save(
      @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody SaveRequest request) {
    return noStore(service.save(jwt, request.changes()));
  }

  @PostMapping("/discard")
  public ResponseEntity<StudioService.SaveResult> discard(
      @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody DiscardRequest request) {
    return noStore(service.discard(jwt, request.ids()));
  }

  @GetMapping("/blocks/{id}/history")
  public ResponseEntity<StudioService.History> history(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
    return noStore(service.history(jwt, id));
  }

  @PostMapping("/blocks/{id}/restore/{rev}")
  public ResponseEntity<Block.View> restore(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable int rev) {
    return noStore(service.restore(jwt, id, rev));
  }

  @GetMapping("/preview")
  public ResponseEntity<Map<String, Object>> preview(@AuthenticationPrincipal Jwt jwt) {
    return noStore(Map.of("content", service.preview(jwt)));
  }

  private static <T> ResponseEntity<T> noStore(T body) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
  }
}
