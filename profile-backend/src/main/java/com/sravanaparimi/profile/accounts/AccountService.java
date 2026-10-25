package com.sravanaparimi.profile.accounts;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountService {
  public record AccountDto(
      UUID id,
      String firstName,
      String lastName,
      String email,
      boolean admin,
      String phone,
      String addressLine1,
      String addressLine2,
      String city,
      String region,
      String postalCode,
      String country) {}

  public record ProfileCreate(@Size(max = 80) String firstName, @Size(max = 80) String lastName) {}

  public record ProfileUpdate(
      @NotNull @Size(max = 80) String firstName,
      @NotNull @Size(max = 80) String lastName,
      @Size(max = 32) String phone,
      @Size(max = 120) String addressLine1,
      @Size(max = 120) String addressLine2,
      @Size(max = 80) String city,
      @Size(max = 80) String region,
      @Size(max = 20) String postalCode,
      @Size(max = 80) String country) {}

  public record Provisioned(AccountDto account, boolean created) {}

  private final JdbcTemplate db;

  public AccountService(JdbcTemplate db) {
    this.db = db;
  }

  @Transactional
  public Provisioned provision(Jwt jwt, ProfileCreate input) {
    String issuer = jwt.getIssuer().toString(), subject = jwt.getSubject();
    String email =
        Boolean.TRUE.equals(jwt.getClaim("email_verified")) ? jwt.getClaimAsString("email") : null;
    int inserted =
        db.update(
            "INSERT INTO accounts(id,issuer,subject,email,first_name,last_name) VALUES"
                + " (?,?,?,?,?,?) ON CONFLICT(issuer,subject) DO NOTHING",
            UUID.randomUUID(),
            issuer,
            subject,
            email,
            value(input == null ? null : input.firstName()),
            value(input == null ? null : input.lastName()));
    if (inserted == 0 && email != null)
      db.update(
          "UPDATE accounts SET email=?,updated_at=now() WHERE issuer=? AND subject=? AND deleted_at"
              + " IS NULL",
          email,
          issuer,
          subject);
    return new Provisioned(find(jwt), inserted == 1);
  }

  @Transactional(readOnly = true)
  public AccountDto getOwn(Jwt jwt) {
    return find(jwt);
  }

  @Transactional
  public AccountDto updateOwn(Jwt jwt, ProfileUpdate input) {
    AccountDto account = find(jwt);
    db.update(
        "UPDATE accounts SET"
            + " first_name=?,last_name=?,phone=?,address_line1=?,address_line2=?,city=?,region=?,postal_code=?,country=?,updated_at=now()"
            + " WHERE id=? AND deleted_at IS NULL",
        input.firstName().trim(),
        input.lastName().trim(),
        blankToNull(input.phone()),
        blankToNull(input.addressLine1()),
        blankToNull(input.addressLine2()),
        blankToNull(input.city()),
        blankToNull(input.region()),
        blankToNull(input.postalCode()),
        blankToNull(input.country()),
        account.id());
    return find(jwt);
  }

  @Transactional
  public void deleteOwn(Jwt jwt) {
    AccountDto account = find(jwt);
    db.update(
        "UPDATE accounts SET"
            + " first_name='',last_name='',email=NULL,phone=NULL,address_line1=NULL,address_line2=NULL,city=NULL,region=NULL,postal_code=NULL,country=NULL,is_admin=false,deleted_at=now()"
            + " WHERE id=?",
        account.id());
  }

  private AccountDto find(Jwt jwt) {
    try {
      return db.queryForObject(
          "SELECT * FROM accounts WHERE issuer=? AND subject=?",
          (rs, n) -> {
            if (rs.getTimestamp("deleted_at") != null) throw gone();
            return new AccountDto(
                rs.getObject("id", UUID.class),
                rs.getString("first_name"),
                rs.getString("last_name"),
                rs.getString("email"),
                rs.getBoolean("is_admin"),
                rs.getString("phone"),
                rs.getString("address_line1"),
                rs.getString("address_line2"),
                rs.getString("city"),
                rs.getString("region"),
                rs.getString("postal_code"),
                rs.getString("country"));
          },
          jwt.getIssuer().toString(),
          jwt.getSubject());
    } catch (EmptyResultDataAccessException ex) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Application profile not found");
    }
  }

  private static ResponseStatusException gone() {
    return new ResponseStatusException(
        HttpStatus.GONE, "Application account was deleted; identity-provider account is separate");
  }

  private static String value(String input) {
    return input == null ? "" : input.trim();
  }

  private static String blankToNull(String input) {
    return input == null || input.isBlank() ? null : input.trim();
  }
}
