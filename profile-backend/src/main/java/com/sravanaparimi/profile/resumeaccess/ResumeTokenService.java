package com.sravanaparimi.profile.resumeaccess;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.*;
import java.time.*;
import java.util.Date;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;

/** Issues and verifies the stateless HS256 resume access token. */
@Component
public class ResumeTokenService {
  public static final String ISSUER = "profile-otp";
  public static final String AUDIENCE = "resume";
  public static final long TTL_SECONDS = 1800;
  static final Duration LEEWAY = Duration.ofSeconds(30);

  public record Claims(String email, String id, Instant issuedAt, Instant expiresAt) {}

  private final OtpCrypto crypto;
  private final Clock clock;
  private final NimbusJwtDecoder decoder;

  @Autowired
  public ResumeTokenService(OtpCrypto crypto) {
    this(crypto, Clock.systemUTC());
  }

  ResumeTokenService(OtpCrypto crypto, Clock clock) {
    this.crypto = crypto;
    this.clock = clock;
    this.decoder =
        NimbusJwtDecoder.withSecretKey(new SecretKeySpec(crypto.tokenKey(), "HmacSHA256"))
            .macAlgorithm(MacAlgorithm.HS256)
            .build();
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            new JwtTimestampValidator(LEEWAY),
            token -> {
              boolean valid =
                  ISSUER.equals(token.getClaimAsString("iss"))
                      && token.getAudience() != null
                      && token.getAudience().contains(AUDIENCE)
                      && token.getSubject() != null
                      && !token.getSubject().isBlank()
                      && token.getExpiresAt() != null
                      && token.getIssuedAt() != null;
              return valid
                  ? OAuth2TokenValidatorResult.success()
                  : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
            }));
  }

  public String issue(String email) {
    Instant now = clock.instant();
    var claims =
        new JWTClaimsSet.Builder()
            .issuer(ISSUER)
            .audience(AUDIENCE)
            .subject(email)
            .jwtID(UUID.randomUUID().toString())
            .issueTime(Date.from(now))
            .expirationTime(Date.from(now.plusSeconds(TTL_SECONDS)))
            .build();
    try {
      var jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
      jwt.sign(new MACSigner(crypto.tokenKey()));
      return jwt.serialize();
    } catch (JOSEException ex) {
      throw new IllegalStateException("Token signing failed", ex);
    }
  }

  /** Verifies signature (HS256 only), issuer, audience and expiry; throws {@link JwtException}. */
  public Claims parse(String token) {
    Jwt jwt = decoder.decode(token);
    return new Claims(jwt.getSubject(), jwt.getId(), jwt.getIssuedAt(), jwt.getExpiresAt());
  }

  /** Decoder for the resume security chain; shares the exact verification path of parse. */
  public JwtDecoder decoder() {
    return decoder;
  }

  /**
   * Peeks at the unverified issuer purely to choose which decoder verifies the token. The claim is
   * never trusted: the selected decoder performs full verification.
   */
  public static boolean isOtpIssuer(String token) {
    try {
      return ISSUER.equals(JWTParser.parse(token).getJWTClaimsSet().getIssuer());
    } catch (Exception ex) {
      return false;
    }
  }
}
