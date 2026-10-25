package com.sravanaparimi.profile.inquiries;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.env.Environment;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class ContactController {
  private final InquiryService service;
  private final boolean enabled;

  public ContactController(InquiryService service, Environment env) {
    this.service = service;
    this.enabled = env.getProperty("profile.contact.enabled", Boolean.class, true);
  }

  @PostMapping("/api/contact")
  public ResponseEntity<InquiryService.Receipt> accept(
      @RequestHeader(value = "Idempotency-Key", required = false) String key,
      @Valid @RequestBody InquiryService.Contact input,
      HttpServletRequest request) {
    if (!enabled)
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, "Contact API is disabled; use the site contact form");
    return ResponseEntity.accepted()
        .cacheControl(CacheControl.noStore())
        .body(service.accept(key, input, request.getRemoteAddr()));
  }
}
