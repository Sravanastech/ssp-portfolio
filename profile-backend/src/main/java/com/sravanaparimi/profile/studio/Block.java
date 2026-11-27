package com.sravanaparimi.profile.studio;

import java.time.Instant;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

/** One content_block row. {@code draft*} fields are the unpublished change, if any. */
public record Block(
    UUID id,
    String type,
    String collection,
    String slug,
    int position,
    Integer draftPosition,
    JsonNode draft,
    JsonNode published,
    boolean draftDeleted,
    long version,
    Instant updatedAt,
    Instant publishedAt) {

  public boolean pending() {
    return draft != null || draftDeleted || draftPosition != null;
  }

  public int effectivePosition() {
    return draftPosition != null ? draftPosition : position;
  }

  /** What the site would show right now. */
  public BlockPart livePart() {
    return new BlockPart(type, collection, slug, position, published);
  }

  /** What the site would show if everything saved were published. Null if it would vanish. */
  public BlockPart draftPart() {
    if (draftDeleted) return null;
    var data = draft != null ? draft : published;
    return data == null ? null : new BlockPart(type, collection, slug, effectivePosition(), data);
  }

  public View view() {
    return new View(
        id,
        type,
        collection,
        slug,
        effectivePosition(),
        draft,
        published,
        draftDeleted,
        pending(),
        version,
        updatedAt,
        publishedAt);
  }

  /** The API shape of a block. */
  public record View(
      UUID id,
      String type,
      String collection,
      String slug,
      int position,
      JsonNode draft,
      JsonNode published,
      boolean draftDeleted,
      boolean pending,
      long version,
      Instant updatedAt,
      Instant publishedAt) {}
}
