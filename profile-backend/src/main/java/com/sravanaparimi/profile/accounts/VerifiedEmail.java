package com.sravanaparimi.profile.accounts;

import java.util.Locale;
import java.util.Optional;
import org.springframework.security.oauth2.jwt.Jwt;

/** Verified email from the access token: namespaced Action claims first, standard claims second. */
public final class VerifiedEmail {
  static final String NS = "https://sravanasparimi.com/";

  private VerifiedEmail() {}

  public static Optional<String> from(Jwt jwt) {
    String email = jwt.getClaimAsString(NS + "email");
    Object verified = jwt.getClaim(NS + "email_verified");
    if (email == null) {
      email = jwt.getClaimAsString("email");
      verified = jwt.getClaim("email_verified");
    }
    if (email == null || !Boolean.TRUE.equals(verified)) return Optional.empty();
    return Optional.of(email.trim().toLowerCase(Locale.ROOT));
  }
}
