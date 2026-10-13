package com.sravanaparimi.profile.publishing;
import com.sravanaparimi.profile.accounts.AdminAuthorization;
import com.sravanaparimi.profile.content.ContentEditorService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
@Service public class PublicationService {
 private final JdbcTemplate db;private final AdminAuthorization admin;
 public PublicationService(JdbcTemplate db,AdminAuthorization admin){this.db=db;this.admin=admin;}
 @Transactional public Map<String,Object> publish(Jwt jwt,long id,long version){var actor=admin.require(jwt);
  // Lock draft and singleton to serialize publication intent, independent of render completion order.
  db.queryForObject("SELECT revision_id FROM site_state FOR UPDATE",Long.class);
  var rows=db.queryForList("SELECT content::text FROM content_revision WHERE id=? AND version=? AND state='draft' FOR UPDATE",id,version);
  if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.CONFLICT,"Draft changed; reload before publishing");
  long revision=db.queryForObject("INSERT INTO content_revision(state,content) VALUES ('draft',?::jsonb) RETURNING id",Long.class,rows.getFirst().get("content"));UUID job=UUID.randomUUID();
  db.update("INSERT INTO publication_jobs(id,revision_id) VALUES (?,?)",job,revision);db.update("UPDATE site_state SET target_revision=?",revision);
  db.update("INSERT INTO audit_events(actor,action,resource) VALUES (?,'publish.request',?)",actor,Long.toString(revision));return Map.of("job",job,"revision",revision,"status","pending");
 }
 public List<Map<String,Object>> jobs(Jwt jwt){admin.require(jwt);return db.queryForList("SELECT id,revision_id,status,error,created_at FROM publication_jobs ORDER BY created_at DESC LIMIT 25");}
}
