package com.sravanaparimi.profile.studio;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** A studio refusal with a machine code and optional structured detail for the UI. */
public class StudioException extends ResponseStatusException {
  private final String code;
  private final Map<String, Object> extra;

  public StudioException(HttpStatus status, String code, String reason, Map<String, Object> extra) {
    super(status, reason);
    this.code = code;
    this.extra = extra;
  }

  public String code() {
    return code;
  }

  public Map<String, Object> extra() {
    return extra;
  }

  /** Per-change validation failures: {index, id, path, message}. */
  public static StudioException invalid(List<Map<String, Object>> errors) {
    return new StudioException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "validation_failed",
        "Some content is not valid",
        Map.of("errors", errors));
  }

  public static StudioException conflict(List<UUID> ids) {
    return new StudioException(
        HttpStatus.CONFLICT,
        "block_conflict",
        "Some items changed since you loaded them",
        Map.of("ids", ids));
  }

  public static StudioException notFound(String what) {
    return new StudioException(HttpStatus.NOT_FOUND, "not_found", what + " not found", Map.of());
  }

  public static StudioException nothingToPublish() {
    return new StudioException(
        HttpStatus.CONFLICT, "nothing_to_publish", "There are no saved changes to publish", Map.of());
  }
}
