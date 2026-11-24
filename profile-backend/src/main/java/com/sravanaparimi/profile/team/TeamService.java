package com.sravanaparimi.profile.team;

import com.sravanaparimi.profile.accounts.*;
import com.sravanaparimi.profile.audit.AuditLog;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TeamService {
  public record Member(
      UUID accountId,
      String firstName,
      String lastName,
      String email,
      String role,
      boolean canPublish,
      Instant since) {}

  public record OpenInvite(
      UUID id, String email, boolean canPublish, Instant createdAt, Instant expiresAt) {}

  public record Team(List<Member> members, List<OpenInvite> invites) {}

  public record Created(UUID id, String token, Instant expiresAt) {}

  static final int MAX_OPEN = 5, MAX_PER_HOUR = 10;

  private final JdbcTemplate db;
  private final Authz authz;
  private final AuditLog audit;
  private final AccountService accounts;

  public TeamService(JdbcTemplate db, Authz authz, AuditLog audit, AccountService accounts) {
    this.db = db;
    this.authz = authz;
    this.audit = audit;
    this.accounts = accounts;
  }

  public Team team(Jwt jwt) {
    authz.require(jwt, Permission.TEAM_MANAGE);
    var members =
        db.query(
            "SELECT id, first_name, last_name, email, role, can_publish,"
                + " coalesce(role_granted_at, created_at) AS since FROM accounts"
                + " WHERE role IS NOT NULL AND deleted_at IS NULL ORDER BY role DESC, since",
            (rs, n) ->
                new Member(
                    rs.getObject("id", UUID.class),
                    rs.getString("first_name"),
                    rs.getString("last_name"),
                    rs.getString("email"),
                    rs.getString("role"),
                    rs.getBoolean("can_publish"),
                    rs.getTimestamp("since").toInstant()));
    var invites =
        db.query(
            "SELECT id, email, can_publish, created_at, expires_at FROM invites"
                + " WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()"
                + " ORDER BY created_at DESC",
            (rs, n) ->
                new OpenInvite(
                    rs.getObject("id", UUID.class),
                    rs.getString("email"),
                    rs.getBoolean("can_publish"),
                    rs.getTimestamp("created_at").toInstant(),
                    rs.getTimestamp("expires_at").toInstant()));
    return new Team(members, invites);
  }

  @Transactional
  public Created invite(Jwt jwt, String rawEmail, boolean canPublish) {
    Actor actor = authz.require(jwt, Permission.TEAM_MANAGE);
    String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase(Locale.ROOT);
    if (email.length() > 254 || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))
      throw new IllegalArgumentException("email");
    db.update(
        "UPDATE invites SET revoked_at=now() WHERE expires_at <= now() AND accepted_at IS NULL"
            + " AND revoked_at IS NULL");
    int lastHour =
        db.queryForObject(
            "SELECT count(*) FROM invites WHERE created_by=? AND created_at > now() - interval '1"
                + " hour'",
            Integer.class,
            actor.accountId());
    if (lastHour >= MAX_PER_HOUR)
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many invites");
    int open =
        db.queryForObject(
            "SELECT count(*) FROM invites WHERE accepted_at IS NULL AND revoked_at IS NULL",
            Integer.class);
    boolean taken =
        db.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM invites WHERE email=? AND accepted_at IS NULL AND"
                + " revoked_at IS NULL) OR EXISTS(SELECT 1 FROM accounts WHERE lower(email)=? AND"
                + " role IS NOT NULL AND deleted_at IS NULL)",
            Boolean.class,
            email,
            email);
    if (open >= MAX_OPEN || taken)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Invite not possible");
    String token = InviteTokens.newToken();
    UUID id = UUID.randomUUID();
    Instant expires = Instant.now().plus(7, ChronoUnit.DAYS);
    try {
      db.update(
          "INSERT INTO invites(id,email,token_hash,can_publish,created_by,expires_at) VALUES"
              + " (?,?,?,?,?,?)",
          id,
          email,
          InviteTokens.hash(token),
          canPublish,
          actor.accountId(),
          java.sql.Timestamp.from(expires));
    } catch (org.springframework.dao.DuplicateKeyException race) { // concurrent invite, same email
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Invite not possible");
    }
    audit.record(actor.accountId(), "team.invite", id.toString(), Map.of("canPublish", canPublish));
    return new Created(id, token, expires);
  }

  @Transactional
  public void revoke(Jwt jwt, UUID id) {
    Actor actor = authz.require(jwt, Permission.TEAM_MANAGE);
    if (db.update(
            "UPDATE invites SET revoked_at=now() WHERE id=? AND accepted_at IS NULL AND revoked_at"
                + " IS NULL",
            id)
        != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
    audit.record(actor.accountId(), "team.invite.revoke", id.toString());
  }

  @Transactional
  public void setPublish(Jwt jwt, UUID accountId, boolean canPublish) {
    Actor actor = authz.require(jwt, Permission.TEAM_MANAGE);
    if (db.update(
            "UPDATE accounts SET can_publish=?, updated_at=now() WHERE id=? AND role='editor'",
            canPublish,
            accountId)
        != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
    audit.record(
        actor.accountId(), "team.publish", accountId.toString(), Map.of("canPublish", canPublish));
  }

  @Transactional
  public void remove(Jwt jwt, UUID accountId) {
    Actor actor = authz.require(jwt, Permission.TEAM_MANAGE);
    if (db.update(
            "UPDATE accounts SET role=NULL, can_publish=false, updated_at=now() WHERE id=? AND"
                + " role='editor'",
            accountId)
        != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
    audit.record(actor.accountId(), "team.remove", accountId.toString());
  }

  /** No role needed: any signed-in user holding a valid invite for their verified email. */
  @Transactional
  public void accept(Jwt jwt, String token) {
    if (token == null || token.length() < 40 || token.length() > 64)
      throw AuthzException.inviteUnavailable();
    String email = VerifiedEmail.from(jwt).orElseThrow(AuthzException::forbidden);
    byte[] hash = InviteTokens.hash(token);
    var account = accounts.provision(jwt, null).account();
    if (account.admin()) {
      // Already owner/editor: never burn a still-valid invite; a spent one reads as unavailable.
      boolean open =
          db.queryForObject(
              "SELECT EXISTS(SELECT 1 FROM invites WHERE token_hash=? AND email=? AND accepted_at"
                  + " IS NULL AND revoked_at IS NULL AND expires_at > now())",
              Boolean.class,
              hash,
              email);
      if (open) throw AuthzException.forbidden();
    }
    var rows =
        db.queryForList(
            "UPDATE invites SET accepted_by=?, accepted_at=now() WHERE token_hash=? AND"
                + " accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now() AND email=?"
                + " RETURNING id, can_publish",
            account.id(),
            hash,
            email);
    if (rows.isEmpty()) {
      boolean exists =
          db.queryForObject(
              "SELECT EXISTS(SELECT 1 FROM invites WHERE token_hash=? AND email=?)",
              Boolean.class,
              hash,
              email);
      throw exists ? AuthzException.inviteUnavailable() : AuthzException.forbidden();
    }
    boolean canPublish = (Boolean) rows.getFirst().get("can_publish");
    db.update(
        "UPDATE accounts SET role='editor', can_publish=?, role_granted_at=now(),"
            + " updated_at=now() WHERE id=? AND role IS NULL",
        canPublish,
        account.id());
    audit.record(account.id(), "team.accept", rows.getFirst().get("id").toString());
  }
}
