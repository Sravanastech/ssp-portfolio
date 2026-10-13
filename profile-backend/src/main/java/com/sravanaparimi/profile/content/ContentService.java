package com.sravanaparimi.profile.content;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import java.time.Duration;
@Service public class ContentService {
 private final JdbcTemplate db; private final JsonMapper json; private final StringRedisTemplate redis;
 public ContentService(JdbcTemplate db,JsonMapper json,StringRedisTemplate redis){this.db=db;this.json=json;this.redis=redis;}
 @SuppressWarnings("unchecked") public SiteSnapshot published(){
  try {
   String revision=redis.opsForValue().get("site:active");
   if(revision==null){revision=db.queryForObject("SELECT revision_id FROM site_state WHERE singleton=true",String.class);redis.opsForValue().set("site:active",revision,Duration.ofSeconds(60));}
   String cached=redis.opsForValue().get("site:snapshot:"+revision);
   if(cached!=null)return json.readValue(cached,SiteSnapshot.class);
   var snapshot=loadPublished(Long.parseLong(revision));
   redis.opsForValue().set("site:snapshot:"+revision,json.writeValueAsString(snapshot),Duration.ofMinutes(5));
   return snapshot;
  } catch(Exception unavailable) { return loadPublished(null); }
 }
 @SuppressWarnings("unchecked") private SiteSnapshot loadPublished(Long revision){
  String sql="SELECT r.id,r.content::text FROM content_revision r JOIN site_state s ON s.revision_id=r.id WHERE r.state='published'"+(revision==null?"":" AND r.id=?");
  return db.queryForObject(sql,(rs,n)->new SiteSnapshot(rs.getLong(1),json.readValue(rs.getString(2),Map.class)),revision==null?new Object[]{}:new Object[]{revision});
 }
}
