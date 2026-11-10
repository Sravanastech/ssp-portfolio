package com.sravanaparimi.profile.accounts;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminAuthorization {
  public static final String AMR_CLAIM = "https://sravanasparimi.com/amr";
  private final AccountService accounts;
  private final String ownerSub;

  public AdminAuthorization(AccountService accounts, Environment env) {
    this.accounts = accounts;
    this.ownerSub = env.getProperty("profile.admin.owner-sub", "");
  }

  /** Admin + MFA, and additionally the token subject must be the configured owner. */
  public UUID requireOwner(Jwt jwt) {
    String sub = jwt.getSubject();
    boolean owner =
        !ownerSub.isBlank()
            && sub != null
            && MessageDigest.isEqual(
                ownerSub.getBytes(StandardCharsets.UTF_8), sub.getBytes(StandardCharsets.UTF_8));
    if (!owner) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Owner access required");
    return require(jwt);
  }

  public UUID require(Jwt jwt) {
    AccountService.AccountDto account;
    try {
      account = accounts.getOwn(jwt);
    } catch (ResponseStatusException ex) {
      if (ex.getStatusCode().value() == 404)
        throw new ResponseStatusException(
            HttpStatus.FORBIDDEN, "Owner account has not been provisioned");
      throw ex;
    }
    // Auth0 reserves plain `amr` on access tokens; its Action emits the namespaced claim. Either is
    // accepted.
    var amr = jwt.getClaimAsStringList("amr");
    var nsAmr = jwt.getClaimAsStringList(AMR_CLAIM);
    boolean mfa = (amr != null && amr.contains("mfa")) || (nsAmr != null && nsAmr.contains("mfa"));
    if (!account.admin() || !mfa)
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Owner permission and verified MFA are required");
    return account.id();
  }
}
