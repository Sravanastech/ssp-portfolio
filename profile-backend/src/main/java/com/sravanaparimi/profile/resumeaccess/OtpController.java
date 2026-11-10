package com.sravanaparimi.profile.resumeaccess;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(path = "/api/resume/otp", produces = MediaType.APPLICATION_JSON_VALUE)
public class OtpController {
  public record OtpRequest(
      @NotBlank @Size(max = 254) String email, @NotBlank @Size(max = 2048) String turnstileToken) {}

  public record OtpChallenge(UUID challengeId, int resendAfterSeconds, int expiresInSeconds) {}

  public record OtpVerify(@NotNull UUID challengeId, @NotNull @Pattern(regexp = "[0-9]{6}") String code) {}

  public record OtpToken(String accessToken, long expiresInSeconds) {}

  private final OtpService service;
  private final ClientIp clientIp;

  public OtpController(OtpService service, ClientIp clientIp) {
    this.service = service;
    this.clientIp = clientIp;
  }

  @PostMapping("/request")
  public ResponseEntity<OtpChallenge> request(
      @Valid @RequestBody OtpRequest body, HttpServletRequest http) {
    var requested = service.request(body.email(), body.turnstileToken(), clientIp.resolve(http));
    return ResponseEntity.accepted()
        .cacheControl(CacheControl.noStore())
        .body(
            new OtpChallenge(
                requested.challengeId(),
                OtpService.RESEND_AFTER_SECONDS,
                OtpService.EXPIRES_IN_SECONDS));
  }

  @PostMapping("/verify")
  public ResponseEntity<OtpToken> verify(
      @Valid @RequestBody OtpVerify body, HttpServletRequest http) {
    String token = service.verify(body.challengeId(), body.code(), clientIp.resolve(http));
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(new OtpToken(token, ResumeTokenService.TTL_SECONDS));
  }

  @ExceptionHandler(OtpException.class)
  ResponseEntity<ProblemDetail> otp(OtpException ex) {
    var problem = ProblemDetail.forStatusAndDetail(HttpStatus.valueOf(ex.status()), "Request rejected");
    problem.setProperty("code", ex.code());
    var response = ResponseEntity.status(ex.status()).cacheControl(CacheControl.noStore());
    if (ex.retryAfterSeconds() != null) {
      problem.setProperty("retryAfterSeconds", ex.retryAfterSeconds());
      response.header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.retryAfterSeconds()));
    }
    if (ex.attemptsRemaining() != null)
      problem.setProperty("attemptsRemaining", ex.attemptsRemaining());
    return response.body(problem);
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    HttpMessageNotReadableException.class,
    HttpMediaTypeNotSupportedException.class
  })
  ResponseEntity<ProblemDetail> malformed(Exception ex) {
    HttpStatus status =
        ex instanceof HttpMediaTypeNotSupportedException
            ? HttpStatus.UNSUPPORTED_MEDIA_TYPE
            : HttpStatus.BAD_REQUEST;
    var problem = ProblemDetail.forStatusAndDetail(status, "Check the submitted fields");
    problem.setProperty("code", "invalid_request");
    return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(problem);
  }
}
