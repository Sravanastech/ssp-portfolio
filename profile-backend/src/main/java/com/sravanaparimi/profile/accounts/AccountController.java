package com.sravanaparimi.profile.accounts;

import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AccountController {
  private final AccountService service;

  public AccountController(AccountService service) {
    this.service = service;
  }

  @PostMapping("/api/me")
  public ResponseEntity<AccountService.AccountDto> provision(
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody(required = false) AccountService.ProfileCreate input) {
    var result = service.provision(jwt, input);
    var response =
        ResponseEntity.status(result.created() ? 201 : 200).cacheControl(CacheControl.noStore());
    if (result.created()) response.header(HttpHeaders.LOCATION, "/api/me");
    return response.body(result.account());
  }

  @GetMapping("/api/me")
  public ResponseEntity<AccountService.AccountDto> get(@AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.getOwn(jwt));
  }

  @PutMapping("/api/me")
  public ResponseEntity<AccountService.AccountDto> update(
      @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AccountService.ProfileUpdate input) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(service.updateOwn(jwt, input));
  }

  @DeleteMapping("/api/me")
  public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt) {
    service.deleteOwn(jwt);
    return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
  }
}
