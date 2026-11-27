package com.sravanaparimi.profile.inquiries;

import com.sravanaparimi.profile.accounts.Authz;
import com.sravanaparimi.profile.accounts.Permission;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/inquiries/{id}/replies")
public class InquiryReplyController {
  public record ReplyRequest(String body) {}

  private final Authz authz;
  private final InquiryReplyService replies;

  public InquiryReplyController(Authz authz, InquiryReplyService replies) {
    this.authz = authz;
    this.replies = replies;
  }

  @GetMapping
  public ResponseEntity<List<InquiryReplyService.ReplyView>> list(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
    authz.require(jwt, Permission.INQUIRIES_MANAGE);
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(replies.list(id));
  }

  @PostMapping
  public ResponseEntity<InquiryReplyService.Created> create(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody ReplyRequest request) {
    var actor = authz.require(jwt, Permission.INQUIRIES_REPLY);
    var created = replies.reply(actor, id, request.body());
    return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(created);
  }
}
