package com.sravanaparimi.profile.content;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
public class ContentController {
  private final ContentService service;

  public ContentController(ContentService service) {
    this.service = service;
  }

  @GetMapping("/api/site")
  public ResponseEntity<SiteSnapshot> get(
      @RequestHeader(value = "If-None-Match", required = false) String match) {
    var snapshot = service.published();
    String tag = "\"site-" + snapshot.revision() + "\"";
    if (tag.equals(match)) return ResponseEntity.status(304).eTag(tag).build();
    return ResponseEntity.ok().eTag(tag).cacheControl(CacheControl.noCache()).body(snapshot);
  }
}
