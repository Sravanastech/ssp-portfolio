package com.sravanaparimi.profile.studio;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Called by the CI deploy run, not by people. Authenticated by the per-release HMAC token only (no
 * JWT). Every refusal for a bad token is the same bare 401 so nothing about releases leaks.
 */
@RestController
@RequestMapping("/api/public/releases")
public class PublicReleaseController {
  public record StatusRequest(
      @NotNull @Pattern(regexp = "building|live|failed") String status,
      @Size(max = 300) @Pattern(regexp = "https://github\\.com/[^\\s]+") String runUrl) {}

  private static final int PER_MINUTE = 30;

  private final ReleaseService service;
  private final ReleaseTokens tokens;
  private final CallbackThrottle failures = new CallbackThrottle(PER_MINUTE);

  public PublicReleaseController(ReleaseService service, ReleaseTokens tokens) {
    this.service = service;
    this.tokens = tokens;
  }

  @GetMapping("/{id}")
  public ResponseEntity<String> snapshot(
      @PathVariable long id,
      @RequestParam(required = false) String token,
      @RequestParam(required = false, defaultValue = "0") long exp) {
    guard(id, token, exp);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .contentType(MediaType.APPLICATION_JSON)
        .body(service.snapshotJson(id));
  }

  @PostMapping("/{id}/status")
  public ResponseEntity<ReleaseService.ReleaseView> status(
      @PathVariable long id,
      @RequestHeader(value = "X-Release-Token", required = false) String token,
      @RequestHeader(value = "X-Release-Expires", required = false) String exp,
      @Valid @RequestBody StatusRequest request) {
    long expires;
    try {
      expires = Long.parseLong(exp == null ? "" : exp.strip());
    } catch (NumberFormatException e) {
      expires = 0;
    }
    guard(id, token, expires);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(service.reportStatus(id, request.status(), request.runUrl()));
  }

  /** Bad credentials are counted; a flood of them gets 429 but never blocks a valid token. */
  private void guard(long id, String token, long exp) {
    if (tokens.verify(id, token, exp)) return;
    if (!failures.tryAcquire())
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests");
    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
  }

  /** Fixed one-minute window shared by all callers. */
  static final class CallbackThrottle {
    private final int perMinute;
    private long windowStart = System.nanoTime();
    private int used;

    CallbackThrottle(int perMinute) {
      this.perMinute = perMinute;
    }

    synchronized boolean tryAcquire() {
      long now = System.nanoTime();
      if (now - windowStart >= 60_000_000_000L) {
        windowStart = now;
        used = 0;
      }
      return ++used <= perMinute;
    }
  }
}
