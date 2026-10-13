package com.sravanaparimi.profile.publishing;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.*;
import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
@RestController public class PublicationController {
 public record Publish(@Min(1) long version){}
 private final PublicationService service;public PublicationController(PublicationService service){this.service=service;}
 @PostMapping("/api/admin/drafts/{id}/publish") public ResponseEntity<Map<String,Object>> publish(@AuthenticationPrincipal Jwt jwt,@PathVariable long id,@Valid @RequestBody Publish p){return ResponseEntity.accepted().cacheControl(CacheControl.noStore()).body(service.publish(jwt,id,p.version()));}
 @GetMapping("/api/admin/publications") public ResponseEntity<List<Map<String,Object>>> list(@AuthenticationPrincipal Jwt jwt){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.jobs(jwt));}
}
