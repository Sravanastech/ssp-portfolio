package com.sravanaparimi.profile.accounts;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.UUID;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class Authz {
  public static final String AMR_CLAIM = "https://sravanasparimi.com/amr";

  private record Row(UUID id, String role, boolean canPublish) {}

  private final JdbcTemplate db;
  private final String ownerSub;

  public Authz(JdbcTemplate db, Environment env) {
    this.db = db;
    this.ownerSub = env.getProperty("profile.admin.owner-sub", "");
  }

  /** Who is calling: account + role + MFA. Throws for anyone without an admin role. */
  public Actor resolve(Jwt jwt) {
    List<Row> rows =
        db.query(
            "SELECT id, role, can_publish FROM accounts"
                + " WHERE issuer=? AND subject=? AND deleted_at IS NULL",
            (rs, n) ->
                new Row(
                    rs.getObject("id", UUID.class),
                    rs.getString("role"),
                    rs.getBoolean("can_publish")),
            jwt.getIssuer().toString(),
            jwt.getSubject());
    if (rows.isEmpty()) throw AuthzException.notProvisioned();
    Row row = rows.getFirst();
    Role role = isOwnerSub(jwt.getSubject()) ? Role.OWNER : Role.fromDb(row.role());
    if (role == null) throw AuthzException.forbidden();
    if (!hasMfa(jwt)) throw AuthzException.mfaRequired();
    return new Actor(row.id(), role, row.canPublish(), role.permissions(row.canPublish()));
  }

  /** Resolve and require one permission. */
  public Actor require(Jwt jwt, Permission permission) {
    Actor actor = resolve(jwt);
    if (!actor.can(permission)) throw AuthzException.forbidden();
    return actor;
  }

  public boolean isOwnerSub(String sub) {
    return !ownerSub.isBlank()
        && sub != null
        && MessageDigest.isEqual(
            ownerSub.getBytes(StandardCharsets.UTF_8), sub.getBytes(StandardCharsets.UTF_8));
  }

  static boolean hasMfa(Jwt jwt) {
    var amr = jwt.getClaimAsStringList("amr");
    var ns = jwt.getClaimAsStringList(AMR_CLAIM);
    return (amr != null && amr.contains("mfa")) || (ns != null && ns.contains("mfa"));
  }
}
