package com.sravanaparimi.profile.content;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import com.sravanaparimi.profile.accounts.AdminAuthorization;
import org.springframework.security.oauth2.jwt.Jwt;
@Service public class ContentEditorService {
 public record DraftDto(long id,long version,Map<String,Object> content){}
 private final JdbcTemplate db; private final JsonMapper json; private final AdminAuthorization admin; private final ContentService content;
 public ContentEditorService(JdbcTemplate db,JsonMapper json,AdminAuthorization admin,ContentService content){this.db=db;this.json=json;this.admin=admin;this.content=content;}
 @SuppressWarnings("unchecked") private DraftDto row(java.sql.ResultSet rs) throws java.sql.SQLException{return new DraftDto(rs.getLong("id"),rs.getLong("version"),json.readValue(rs.getString("content"),Map.class));}
 public List<DraftDto> list(Jwt jwt){admin.require(jwt);return db.query("SELECT * FROM content_revision WHERE state='draft' ORDER BY id DESC LIMIT 50",(rs,n)->row(rs));}
 @Transactional public DraftDto create(Jwt jwt){var actor=admin.require(jwt);long id=db.queryForObject("INSERT INTO content_revision(state,content) VALUES ('draft',?::jsonb) RETURNING id",Long.class,json.writeValueAsString(content.published().content()));audit(actor,"draft.create",id);return draft(id);}
 public DraftDto draft(long id){return db.query("SELECT * FROM content_revision WHERE id=? AND state='draft'",(rs,n)->row(rs),id).stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Draft not found"));}
 @Transactional public DraftDto save(Jwt jwt,long id,long version,Map<String,Object> input){var actor=admin.require(jwt);validate(input,content.published().content(),"content",0);if(json.writeValueAsBytes(input).length>250000)throw new IllegalArgumentException("Content too large");
  if(db.update("UPDATE content_revision SET content=?::jsonb,version=version+1 WHERE id=? AND version=? AND state='draft'",json.writeValueAsString(input),id,version)!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"Draft changed; reload before saving");audit(actor,"draft.save",id);return draft(id);
 }
 public void audit(UUID actor,String action,long id){db.update("INSERT INTO audit_events(actor,action,resource) VALUES (?,?,?)",actor,action,Long.toString(id));}
 private void validate(Object value,Object model,String field,int depth){
  if(depth>12)throw new IllegalArgumentException("Content nesting");
  if(model instanceof Map<?,?> shape){if(!(value instanceof Map<?,?> map)||!map.keySet().equals(shape.keySet()))throw new IllegalArgumentException("Unknown or missing fields");for(var k:shape.keySet())validate(map.get(k),shape.get(k),k.toString(),depth+1);}
  else if(model instanceof List<?> shape){if(!(value instanceof List<?> list)||list.size()>100)throw new IllegalArgumentException("Invalid list");if(!shape.isEmpty())for(var item:list)validate(item,shape.getFirst(),field,depth+1);}
  else if(model instanceof String){if(!(value instanceof String s)||s.length()>8000||s.indexOf(0)>=0||s.toLowerCase(Locale.ROOT).contains("</script"))throw new IllegalArgumentException("Invalid text");if(Set.of("url","linkedin","href","src").contains(field)&&!(s.startsWith("https://")||s.startsWith("/api/media/public/")||(s.startsWith("/")&&!s.startsWith("//")&&!s.contains(".."))))throw new IllegalArgumentException("Unsafe URL");}
  else if(model instanceof Number){if(!(value instanceof Number))throw new IllegalArgumentException("Invalid number");}
  else if(model instanceof Boolean){if(!(value instanceof Boolean))throw new IllegalArgumentException("Invalid boolean");}
 }
}
