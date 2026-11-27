package com.sravanaparimi.profile.inquiries;

import com.sravanaparimi.profile.resumeaccess.ClientIp;
import com.sravanaparimi.profile.resumeaccess.TurnstileVerifier;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.core.env.Environment;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class ContactController {
  public static final String TURNSTILE_ACTION = "contact";

  public record ContactRequest(
      @NotBlank @Size(max = 120) String name,
      @Email @Size(max = 254) String email,
      @Size(max = 32) String phone,
      @NotBlank @Size(min = 10, max = 8000) String message,
      @Size(max = 200) String website,
      @Size(max = 2048) String turnstileToken) {}

  private final InquiryService service;
  private final InquiryAlertService alerts;
  private final TurnstileVerifier turnstile;
  private final ClientIp clientIp;
  private final boolean enabled;

  public ContactController(
      InquiryService service,
      InquiryAlertService alerts,
      TurnstileVerifier turnstile,
      ClientIp clientIp,
      Environment env) {
    this.service = service;
    this.alerts = alerts;
    this.turnstile = turnstile;
    this.clientIp = clientIp;
    this.enabled = env.getProperty("profile.contact.enabled", Boolean.class, true);
  }

  @PostMapping("/api/contact")
  public ResponseEntity<InquiryService.Receipt> accept(
      @RequestHeader(value = "Idempotency-Key", required = false) String key,
      @Valid @RequestBody ContactRequest input,
      HttpServletRequest request) {
    if (!enabled)
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, "Contact API is disabled; use the site contact form");
    String token = input.turnstileToken();
    if (token == null || token.isBlank())
      throw new ContactException(HttpStatus.BAD_REQUEST, "captcha_required", null);
    String ip = clientIp.resolve(request);
    if (!turnstile.verify(token, ip, TURNSTILE_ACTION))
      throw new ContactException(HttpStatus.FORBIDDEN, "captcha_failed", null);
    var receipt =
        service.accept(
            key,
            new InquiryService.Contact(
                input.name(), input.email(), input.phone(), input.message(), input.website()),
            ip);
    alerts.alert(receipt.receipt());
    return ResponseEntity.accepted().cacheControl(CacheControl.noStore()).body(receipt);
  }

  @ExceptionHandler(ContactException.class)
  ResponseEntity<ProblemDetail> rejected(ContactException ex) {
    var problem = ProblemDetail.forStatusAndDetail(ex.getStatusCode(), "Request rejected");
    problem.setProperty("code", ex.code());
    var response = ResponseEntity.status(ex.getStatusCode()).cacheControl(CacheControl.noStore());
    if (ex.retryAfterSeconds() != null) {
      problem.setProperty("retryAfterSeconds", ex.retryAfterSeconds());
      response.header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.retryAfterSeconds()));
    }
    return response.body(problem);
  }
}
