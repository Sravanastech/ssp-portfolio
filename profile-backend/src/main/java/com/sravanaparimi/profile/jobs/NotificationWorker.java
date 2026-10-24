package com.sravanaparimi.profile.jobs;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.core.env.Environment;
import com.sravanaparimi.profile.platform.EmailGateway;
import java.util.*;
@ConditionalOnProperty(name="profile.notifications.enabled",havingValue="true",matchIfMissing=true) @Component public class NotificationWorker {
 private final JdbcTemplate db;private final EmailGateway email;private final Environment env;
 public NotificationWorker(JdbcTemplate db,EmailGateway email,Environment env){this.db=db;this.email=email;this.env=env;}
 @Scheduled(fixedDelayString="${profile.jobs.interval-ms:3000}") public void tick(){if(env.getProperty("profile.jobs.enabled",Boolean.class,true))runOnce();}
 public void runOnce(){
  UUID lease=UUID.randomUUID();
  var events=db.queryForList("WITH claim AS (SELECT id FROM outbox WHERE ((status='pending' AND available_at<=now()) OR (status='processing' AND lease_until<now())) AND attempts<5 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 10) UPDATE outbox o SET status='processing',lease_id=?,lease_until=now()+interval '60 seconds',attempts=attempts+1 FROM claim WHERE o.id=claim.id RETURNING o.id,o.inquiry_id,o.attempts,o.created_at",lease);
  for(var event:events){UUID id=(UUID)event.get("id");int attempt=((Number)event.get("attempts")).intValue();
   try{
    // A provider's 24h idempotency window cannot protect older ambiguous sends.
    var created=(java.sql.Timestamp)event.get("created_at");
    if(!env.getProperty("profile.email.mode","capture").equals("capture")&&created.toInstant().isBefore(java.time.Instant.now().minusSeconds(23*3600)))throw new IllegalStateException("Expired provider deduplication window");
    var inquiry=db.queryForMap("SELECT name,email,phone,message FROM inquiries WHERE id=?",event.get("inquiry_id"));email.send(id,inquiry);
    db.update("UPDATE outbox SET status='sent',lease_id=NULL,lease_until=NULL,last_error=NULL WHERE id=? AND lease_id=?",id,lease);
   }catch(Exception ex){long delay=(1L<<attempt)*10+java.util.concurrent.ThreadLocalRandom.current().nextLong(10);
    boolean expired=((java.sql.Timestamp)event.get("created_at")).toInstant().isBefore(java.time.Instant.now().minusSeconds(23*3600));
    db.update("UPDATE outbox SET status=?,available_at=now()+(? * interval '1 second'),lease_id=NULL,lease_until=NULL,last_error='notification_failed' WHERE id=? AND lease_id=?",attempt>=5||expired?"failed":"pending",delay,id,lease);
   }
  }
  db.update("UPDATE outbox SET status='failed',last_error='retry_limit' WHERE status='processing' AND lease_until<now() AND attempts>=5");
 }
}
