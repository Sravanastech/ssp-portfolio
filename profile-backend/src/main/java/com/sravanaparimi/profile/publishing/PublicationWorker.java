package com.sravanaparimi.profile.publishing;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.data.redis.core.StringRedisTemplate;
import java.util.*;
@ConditionalOnProperty(name="profile.publishing.enabled",havingValue="true",matchIfMissing=true) @Component public class PublicationWorker {
 private final JdbcTemplate db;private final HtmlRenderer renderer;private final Environment env;private final TransactionTemplate tx;private final StringRedisTemplate redis;
 public PublicationWorker(JdbcTemplate db,HtmlRenderer renderer,Environment env,PlatformTransactionManager tm,StringRedisTemplate redis){this.db=db;this.renderer=renderer;this.env=env;this.tx=new TransactionTemplate(tm);this.redis=redis;}
 @Scheduled(fixedDelayString="${profile.jobs.interval-ms:3000}") public void tick(){if(env.getProperty("profile.jobs.enabled",Boolean.class,true))runOnce();}
 public void runOnce(){UUID lease=UUID.randomUUID();
  var jobs=db.queryForList("WITH claim AS (SELECT id FROM publication_jobs WHERE status='pending' OR (status='processing' AND lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE publication_jobs j SET status='processing',lease_id=?,lease_until=now()+interval '90 seconds' FROM claim WHERE j.id=claim.id RETURNING j.id,j.revision_id",lease);
  for(var job:jobs){long revision=((Number)job.get("revision_id")).longValue();UUID id=(UUID)job.get("id");
   try {String content=db.queryForObject("SELECT content::text FROM content_revision WHERE id=?",String.class,revision);renderer.render(revision,"{\"revision\":"+revision+",\"content\":"+content+"}");
    tx.executeWithoutResult(status->{Long desired=db.queryForObject("SELECT target_revision FROM site_state FOR UPDATE",Long.class);
     var current=db.queryForList("SELECT lease_id FROM publication_jobs WHERE id=? FOR UPDATE",UUID.class,id);if(!lease.equals(current.getFirst()))return;
     if(desired!=null&&desired==revision){db.update("UPDATE content_revision SET state='published' WHERE id=?",revision);db.update("UPDATE site_state SET revision_id=?",revision);db.update("UPDATE publication_jobs SET status='complete',lease_id=NULL,lease_until=NULL WHERE id=? AND lease_id=?",id,lease);try{redis.delete("site:active");}catch(Exception ignored){}}
     else db.update("UPDATE publication_jobs SET status='superseded',lease_id=NULL,lease_until=NULL WHERE id=? AND lease_id=?",id,lease);
    });
   }catch(Exception ex){db.update("UPDATE publication_jobs SET status='failed',error='render_failed',lease_id=NULL,lease_until=NULL WHERE id=? AND lease_id=?",id,lease);}
  }
 }
}
