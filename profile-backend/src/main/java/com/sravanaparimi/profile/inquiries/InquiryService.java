package com.sravanaparimi.profile.inquiries;

import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@Service
public class InquiryService {
  public record Contact(
      @NotBlank @Size(max = 120) String name,
      @Email @Size(max = 254) String email,
      @Size(max = 32) String phone,
      @NotBlank @Size(min = 10, max = 8000) String message,
      @Size(max = 200) String website) {}

  public record Receipt(UUID receipt, String status) {}

  private final JdbcTemplate db;
  private final JsonMapper json;
  private final String salt;

  public InquiryService(JdbcTemplate db, JsonMapper json, Environment env) {
    this.db = db;
    this.json = json;
    this.salt = env.getRequiredProperty("profile.inquiries.ip-salt");
  }

  public static String hash(String s) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception ex) {
      throw new IllegalStateException(ex);
    }
  }

  @Transactional
  public Receipt accept(String key, Contact c, String address) {
    if (key == null || !key.matches("[a-zA-Z0-9_-]{16,128}"))
      throw new IllegalArgumentException("Idempotency key required");
    if (c.website() != null && !c.website().isBlank())
      throw new IllegalArgumentException("Submission rejected");
    if ((c.email() == null || c.email().isBlank())
        && (c.phone() == null || !c.phone().matches("[+0-9 ()-]{7,32}")))
      throw new IllegalArgumentException("Contact method required");
    String hash = hash(json.writeValueAsString(c));
    UUID id = UUID.randomUUID();
    int inserted =
        db.update(
            "INSERT INTO inquiries(id,idempotency_key,payload_hash,name,email,phone,message) VALUES"
                + " (?,?,?,?,?,?,?) ON CONFLICT(idempotency_key) DO NOTHING",
            id,
            key,
            hash,
            c.name(),
            c.email(),
            c.phone(),
            c.message());
    if (inserted == 0)
      return db.queryForObject(
          "SELECT id,payload_hash FROM inquiries WHERE idempotency_key=?",
          (rs, n) -> {
            if (!hash.equals(rs.getString(2)))
              throw new ResponseStatusException(
                  HttpStatus.CONFLICT, "Key already used for another message");
            return new Receipt(rs.getObject(1, UUID.class), "accepted");
          },
          key);
    int count =
        db.queryForObject(
            "INSERT INTO contact_limits(key,requests) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET"
                + " requests=CASE WHEN contact_limits.window_start<now()-interval '1 hour' THEN 1"
                + " ELSE contact_limits.requests+1 END,window_start=CASE WHEN"
                + " contact_limits.window_start<now()-interval '1 hour' THEN now() ELSE"
                + " contact_limits.window_start END RETURNING requests",
            Integer.class,
            hash(salt + address));
    if (count > 5)
      throw new ContactException(HttpStatus.TOO_MANY_REQUESTS, "rate_limited", 3600);
    db.update("INSERT INTO outbox(id,inquiry_id) VALUES (?,?)", UUID.randomUUID(), id);
    return new Receipt(id, "accepted");
  }
}
