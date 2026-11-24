package com.sravanaparimi.profile.team;

import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
public class TeamController {
  public record InviteRequest(String email, Boolean canPublish) {}

  public record PublishRequest(boolean canPublish) {}

  public record AcceptRequest(String token) {}

  public record Accepted(String role) {}

  private final TeamService team;

  public TeamController(TeamService team) {
    this.team = team;
  }

  @GetMapping("/api/admin/team")
  public ResponseEntity<TeamService.Team> list(@AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(team.team(jwt));
  }

  @PostMapping("/api/admin/team/invites")
  public ResponseEntity<TeamService.Created> invite(
      @AuthenticationPrincipal Jwt jwt, @RequestBody InviteRequest body) {
    return ResponseEntity.status(201)
        .cacheControl(CacheControl.noStore())
        .body(team.invite(jwt, body.email(), Boolean.TRUE.equals(body.canPublish())));
  }

  @DeleteMapping("/api/admin/team/invites/{id}")
  public ResponseEntity<Void> revoke(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
    team.revoke(jwt, id);
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/api/admin/team/{accountId}")
  public ResponseEntity<Void> publish(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID accountId,
      @RequestBody PublishRequest body) {
    team.setPublish(jwt, accountId, body.canPublish());
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/api/admin/team/{accountId}")
  public ResponseEntity<Void> remove(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID accountId) {
    team.remove(jwt, accountId);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/api/admin/invites/accept")
  public ResponseEntity<Accepted> accept(
      @AuthenticationPrincipal Jwt jwt, @RequestBody AcceptRequest body) {
    team.accept(jwt, body.token());
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new Accepted("editor"));
  }
}
