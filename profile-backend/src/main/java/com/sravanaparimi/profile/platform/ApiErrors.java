package com.sravanaparimi.profile.platform;

import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<ProblemDetail> status(ResponseStatusException ex) {
    var p =
        ProblemDetail.forStatusAndDetail(
            ex.getStatusCode(), ex.getReason() == null ? "Request rejected" : ex.getReason());
    if (ex instanceof com.sravanaparimi.profile.accounts.AuthzException a)
      p.setProperty("code", a.code());
    return ResponseEntity.status(ex.getStatusCode()).cacheControl(CacheControl.noStore()).body(p);
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    HttpMessageNotReadableException.class,
    IllegalArgumentException.class
  })
  ResponseEntity<ProblemDetail> invalid(Exception ex) {
    return ResponseEntity.badRequest()
        .cacheControl(CacheControl.noStore())
        .body(
            ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Check the submitted fields"));
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  ResponseEntity<ProblemDetail> tooLarge() {
    return ResponseEntity.status(413)
        .cacheControl(CacheControl.noStore())
        .body(ProblemDetail.forStatus(413));
  }
}
