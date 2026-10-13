package com.sravanaparimi.profile.jobs;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.UUID;
@Component public class ScheduledJobCoordinator {
 private final JdbcTemplate db;private final TransactionTemplate tx;
 public ScheduledJobCoordinator(JdbcTemplate db,PlatformTransactionManager tm){this.db=db;tx=new TransactionTemplate(tm);}
 // Actions must perform only database work in this transaction; external effects require outbox.
 public boolean runIfClaimed(String name,Instant time,Runnable action){return Boolean.TRUE.equals(tx.execute(status->{
  db.update("INSERT INTO job_runs(name,scheduled_at) VALUES (?,?) ON CONFLICT DO NOTHING",name,Timestamp.from(time));
  var states=db.queryForList("SELECT status FROM job_runs WHERE name=? AND scheduled_at=? FOR UPDATE",String.class,name,Timestamp.from(time));
  if(states.getFirst().equals("complete"))return false;
  action.run();db.update("UPDATE job_runs SET status='complete',attempts=attempts+1 WHERE name=? AND scheduled_at=?",name,Timestamp.from(time));return true;
 }));}
}
