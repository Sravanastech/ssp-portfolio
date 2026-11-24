package com.sravanaparimi.profile.publishing;

import com.sravanaparimi.profile.accounts.Authz;
import com.sravanaparimi.profile.accounts.Permission;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PublicationService {
  private final JdbcTemplate db;
  private final Authz authz;
  private final Environment env;

  public PublicationService(JdbcTemplate db, Authz authz, Environment env) {
    this.db = db;
    this.authz = authz;
    this.env = env;
  }

  @Transactional
  public Map<String, Object> publish(Jwt jwt, long id, long version) {
    var actor = authz.require(jwt, Permission.CONTENT_PUBLISH).accountId();
    if (!env.getProperty("profile.publishing.enabled", Boolean.class, true))
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, "Publishing is disabled in this environment");
    // Lock draft and singleton to serialize publication intent, independent of render completion
    // order.
    db.queryForObject("SELECT revision_id FROM site_state FOR UPDATE", Long.class);
    var rows =
        db.queryForList(
            "SELECT content::text FROM content_revision WHERE id=? AND version=? AND state='draft'"
                + " FOR UPDATE",
            id,
            version);
    if (rows.isEmpty())
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Draft changed; reload before publishing");
    long revision =
        db.queryForObject(
            "INSERT INTO content_revision(state,content) VALUES ('draft',?::jsonb) RETURNING id",
            Long.class,
            rows.getFirst().get("content"));
    UUID job = UUID.randomUUID();
    db.update("INSERT INTO publication_jobs(id,revision_id) VALUES (?,?)", job, revision);
    db.update("UPDATE site_state SET target_revision=?", revision);
    db.update(
        "INSERT INTO audit_events(actor,action,resource) VALUES (?,'publish.request',?)",
        actor,
        Long.toString(revision));
    return Map.of("job", job, "revision", revision, "status", "pending");
  }

  public List<Map<String, Object>> jobs(Jwt jwt) {
    authz.require(jwt, Permission.CONTENT_PUBLISH);
    return db.queryForList(
        "SELECT id,revision_id,status,error,created_at FROM publication_jobs ORDER BY created_at"
            + " DESC LIMIT 25");
  }
}
