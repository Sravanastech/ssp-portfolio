package com.sravanaparimi.profile.inquiries;

import com.sravanaparimi.profile.platform.EmailGateway;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Sends the owner alert in the request thread, after the inquiry transaction has committed. Cloud
 * Run gives no CPU between requests, so the scheduled NotificationWorker cannot be relied on there.
 * Failure never propagates: the outbox row stays pending for a worker that does run elsewhere.
 */
@Service
public class InquiryAlertService {
  private static final Logger log = LoggerFactory.getLogger(InquiryAlertService.class);

  private final JdbcTemplate db;
  private final EmailGateway email;
  private final boolean enabled;

  public InquiryAlertService(JdbcTemplate db, EmailGateway email, Environment env) {
    this.db = db;
    this.email = email;
    this.enabled = env.getProperty("profile.notifications.enabled", Boolean.class, true);
  }

  /** Not transactional on purpose: each statement commits on its own. Never throws. */
  public void alert(UUID inquiryId) {
    if (!enabled) return;
    UUID lease = UUID.randomUUID();
    UUID outboxId = null;
    try {
      // Lease the row so the background worker cannot double-send while this request does.
      var claimed =
          db.queryForList(
              "UPDATE outbox SET status='processing',lease_id=?,lease_until=now()+interval '60"
                  + " seconds',attempts=attempts+1 WHERE inquiry_id=? AND status='pending' AND"
                  + " available_at<=now() AND attempts<5 RETURNING id",
              UUID.class,
              lease,
              inquiryId);
      if (claimed.isEmpty()) return; // already sent, leased elsewhere, or exhausted
      outboxId = claimed.get(0);
      var inquiry =
          db.queryForMap("SELECT name,email,phone,message FROM inquiries WHERE id=?", inquiryId);
      email.send(outboxId, inquiry);
      db.update(
          "UPDATE outbox SET status='sent',lease_id=NULL,lease_until=NULL,last_error=NULL WHERE"
              + " id=? AND lease_id=?",
          outboxId,
          lease);
    } catch (Exception ex) {
      // Deliberately no message or stack: they could echo recipient or content.
      log.warn("inquiry alert failed; left pending ({})", ex.getClass().getSimpleName());
      if (outboxId == null) return;
      try {
        db.update(
            "UPDATE outbox SET status='pending',available_at=now()+interval '30"
                + " seconds',lease_id=NULL,lease_until=NULL,last_error='notification_failed' WHERE"
                + " id=? AND lease_id=?",
            outboxId,
            lease);
      } catch (Exception ignored) {
        // lease expiry lets the worker reclaim it
      }
    }
  }
}
