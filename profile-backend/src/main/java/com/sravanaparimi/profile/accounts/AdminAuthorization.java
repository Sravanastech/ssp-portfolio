package com.sravanaparimi.profile.accounts;
import org.springframework.stereotype.Service;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.UUID;
@Service public class AdminAuthorization {
 public static final String AMR_CLAIM="https://sravanasparimi.com/amr";
 private final AccountService accounts;
 public AdminAuthorization(AccountService accounts){this.accounts=accounts;}
 public UUID require(Jwt jwt){
  AccountService.AccountDto account;
  try{account=accounts.getOwn(jwt);}catch(ResponseStatusException ex){if(ex.getStatusCode().value()==404)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Owner account has not been provisioned");throw ex;}
  // Auth0 reserves plain `amr` on access tokens; its Action emits the namespaced claim. Either is accepted.
  var amr=jwt.getClaimAsStringList("amr");var nsAmr=jwt.getClaimAsStringList(AMR_CLAIM);
  boolean mfa=(amr!=null&&amr.contains("mfa"))||(nsAmr!=null&&nsAmr.contains("mfa"));
  if(!account.admin() || !mfa) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Owner permission and verified MFA are required");
  return account.id();
 }
}
