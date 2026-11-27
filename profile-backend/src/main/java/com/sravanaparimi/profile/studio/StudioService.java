package com.sravanaparimi.profile.studio;

import com.sravanaparimi.profile.accounts.Authz;
import com.sravanaparimi.profile.accounts.Permission;
import com.sravanaparimi.profile.audit.AuditLog;
import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Draft editing of blocks: batch save, discard, history, restore, preview. */
@Service
public class StudioService {
  public record Change(
      UUID id,
      String type,
      String collection,
      String slug,
      Integer position,
      JsonNode draft,
      Boolean delete,
      Long version) {}

  public record SaveResult(List<Block.View> blocks, List<UUID> removed) {}

  public record Overview(List<Block.View> blocks, List<JsonNode> schemas, int pendingCount) {}

  public record History(UUID blockId, List<RevisionView> revisions) {}

  public record RevisionView(int rev, JsonNode data, UUID createdBy, java.time.Instant createdAt) {}

  static final int MAX_CHANGES = 200;
  static final int MAX_REQUEST_BYTES = 2_000_000;

  private final BlockRepository blocks;
  private final SchemaRegistry registry;
  private final BlockValidator validator;
  private final SnapshotAssembler assembler;
  private final Authz authz;
  private final AuditLog audit;
  private final JsonMapper json;

  public StudioService(
      BlockRepository blocks,
      SchemaRegistry registry,
      BlockValidator validator,
      SnapshotAssembler assembler,
      Authz authz,
      AuditLog audit,
      JsonMapper json) {
    this.blocks = blocks;
    this.registry = registry;
    this.validator = validator;
    this.assembler = assembler;
    this.authz = authz;
    this.audit = audit;
    this.json = json;
  }

  @Transactional(readOnly = true)
  public Overview overview(Jwt jwt) {
    authz.require(jwt, Permission.CONTENT_EDIT);
    var all = blocks.all();
    return new Overview(
        all.stream().map(Block::view).toList(),
        registry.all().stream().map(StudioSchema::document).toList(),
        (int) all.stream().filter(Block::pending).count());
  }

  @Transactional(readOnly = true)
  public JsonNode preview(Jwt jwt) {
    authz.require(jwt, Permission.CONTENT_EDIT);
    var parts = blocks.all().stream().map(Block::draftPart).filter(Objects::nonNull).toList();
    return assembler.assemble(parts);
  }

  @Transactional
  public SaveResult save(Jwt jwt, List<Change> changes) {
    var actor = authz.require(jwt, Permission.CONTENT_EDIT).accountId();
    if (changes == null || changes.isEmpty() || changes.size() > MAX_CHANGES)
      throw new IllegalArgumentException("changes");
    var errors = new ArrayList<Map<String, Object>>();
    var seen = new HashSet<UUID>();
    int bytes = 0;
    for (int i = 0; i < changes.size(); i++) {
      var c = changes.get(i);
      if (c.id() != null && !seen.add(c.id())) fail(errors, i, c, "$", "Duplicate block in request");
      if (c.draft() != null) bytes += json.writeValueAsBytes(c.draft()).length;
    }
    if (bytes > MAX_REQUEST_BYTES) fail(errors, 0, changes.getFirst(), "$", "Request too large");
    if (!errors.isEmpty()) throw StudioException.invalid(errors);

    var existing = blocks.lock(seen);
    var conflicts = new ArrayList<UUID>();
    for (var c : changes) {
      if (c.id() == null) continue;
      var row = existing.get(c.id());
      if (c.version() != null && (row == null || row.version() != c.version())) conflicts.add(c.id());
    }
    if (!conflicts.isEmpty()) throw StudioException.conflict(conflicts);

    var slugsByType = new HashMap<String, Set<String>>();
    var nextPositions = new HashMap<String, Integer>();
    var touched = new LinkedHashSet<UUID>();
    var removed = new ArrayList<UUID>();
    var ops = new ArrayList<Map<String, Object>>();
    var writes = new ArrayList<Runnable>();
    for (int i = 0; i < changes.size(); i++) {
      var c = changes.get(i);
      var row = c.id() == null ? null : existing.get(c.id());
      if (row == null) {
        create(i, c, actor, slugsByType, nextPositions, errors, writes, touched, ops);
      } else {
        update(i, c, row, actor, errors, writes, touched, removed, ops);
      }
    }
    if (!errors.isEmpty()) throw StudioException.invalid(errors);
    writes.forEach(Runnable::run);
    audit.record(actor, "studio.save", "studio", Map.of("blocks", ops));
    touched.removeAll(removed);
    return new SaveResult(blocks.byIds(touched).stream().map(Block::view).toList(), removed);
  }

  private void create(
      int index,
      Change c,
      UUID actor,
      Map<String, Set<String>> slugsByType,
      Map<String, Integer> nextPositions,
      List<Map<String, Object>> errors,
      List<Runnable> writes,
      Set<UUID> touched,
      List<Map<String, Object>> ops) {
    var schemaOpt = c.type() == null ? Optional.<StudioSchema>empty() : registry.get(c.type());
    if (schemaOpt.isEmpty()) {
      fail(errors, index, c, "$.type", "Unknown block type");
      return;
    }
    var schema = schemaOpt.get();
    if (c.draft() == null || !c.draft().isObject()) {
      fail(errors, index, c, "$.draft", "Content is required for a new item");
      return;
    }
    if (Boolean.TRUE.equals(c.delete())) {
      fail(errors, index, c, "$.delete", "Cannot delete an item that does not exist");
      return;
    }
    if (c.collection() != null && !Objects.equals(c.collection(), schema.collection())) {
      fail(errors, index, c, "$.collection", "Collection does not match the block type");
      return;
    }
    var taken = slugsByType.computeIfAbsent(schema.type(), blocks::slugs);
    String slug;
    if (c.slug() != null) {
      slug = c.slug();
      if (!Slugs.isValid(slug)) {
        fail(errors, index, c, "$.slug", "Invalid slug");
        return;
      }
      if (taken.contains(slug)) {
        fail(errors, index, c, "$.slug", "Slug already in use");
        return;
      }
    } else if (schema.shape() == StudioSchema.Shape.OBJECT) {
      slug = schema.type();
      if (taken.contains(slug)) {
        fail(errors, index, c, "$.type", "This singleton already exists");
        return;
      }
    } else if (schema.shape() == StudioSchema.Shape.KEYED
        || schema.shape() == StudioSchema.Shape.MERGE) {
      fail(errors, index, c, "$.slug", "Slug is required for this block type");
      return;
    } else {
      String base = deriveSlug(schema, c.draft());
      if (base.isEmpty()) base = schema.type();
      slug = Slugs.unique(base, taken);
    }
    JsonNode data = withGeneratedId(schema, slug, c.draft());
    var violations = validator.validate(schema.type(), slug, data);
    if (!violations.isEmpty()) {
      violations.forEach(v -> fail(errors, index, c, v.path(), v.message()));
      return;
    }
    taken.add(slug);
    UUID id = c.id() != null ? c.id() : UUID.randomUUID();
    int position =
        schema.shape() != StudioSchema.Shape.ITEM
            ? 0
            : c.position() != null
                ? Math.max(0, c.position())
                : nextPositions.compute(
                    schema.type(), (k, last) -> last == null ? blocks.nextPosition(k) : last + 1);
    var row =
        new Block(id, schema.type(), schema.collection(), slug, position, null, data, null, false, 1, null, null);
    writes.add(() -> blocks.insert(row, data, actor));
    touched.add(id);
    ops.add(Map.of("id", id.toString(), "type", schema.type(), "op", "create"));
  }

  private static String deriveSlug(StudioSchema schema, JsonNode draft) {
    var candidates = new ArrayList<String>();
    if (schema.slugFrom() != null) candidates.add(schema.slugFrom());
    candidates.addAll(List.of("title", "name", "label", "domain"));
    for (String field : candidates) {
      String slug = Slugs.slugify(draft.path(field).asString(""));
      if (!slug.isEmpty()) return slug;
    }
    return "";
  }

  private JsonNode withGeneratedId(StudioSchema schema, String slug, JsonNode draft) {
    if (!schema.document().at("/properties/id").isObject() || draft.has("id")) return draft;
    ObjectNode copy = ((ObjectNode) draft).deepCopy();
    copy.put("id", slug);
    return copy;
  }

  private void update(
      int index,
      Change c,
      Block row,
      UUID actor,
      List<Map<String, Object>> errors,
      List<Runnable> writes,
      Set<UUID> touched,
      List<UUID> removed,
      List<Map<String, Object>> ops) {
    if (c.version() == null) {
      fail(errors, index, c, "$.version", "Version is required to change an existing item");
      return;
    }
    if (c.type() != null && !c.type().equals(row.type())) {
      fail(errors, index, c, "$.type", "Block type cannot change");
      return;
    }
    if (c.draft() == null && c.position() == null && c.delete() == null) {
      fail(errors, index, c, "$", "Nothing to change");
      return;
    }
    JsonNode draft = row.draft();
    if (c.draft() != null) {
      var violations = validator.validate(row.type(), row.slug(), c.draft());
      if (!violations.isEmpty()) {
        violations.forEach(v -> fail(errors, index, c, v.path(), v.message()));
        return;
      }
      draft = c.draft();
    }
    boolean neverPublished = row.published() == null;
    if (Boolean.TRUE.equals(c.delete()) && neverPublished) {
      writes.add(() -> blocks.delete(row.id()));
      removed.add(row.id());
      touched.add(row.id());
      ops.add(Map.of("id", row.id().toString(), "type", row.type(), "op", "delete"));
      return;
    }
    boolean deleted = c.delete() != null ? c.delete() : row.draftDeleted();
    Integer draftPosition = row.draftPosition();
    if (c.position() != null && !neverPublished)
      draftPosition = c.position() == row.position() ? null : c.position();
    if (draft != null && draft.equals(row.published())) draft = null;
    final JsonNode finalDraft = draft;
    final Integer finalPos = draftPosition;
    writes.add(
        () -> {
          blocks.saveDraftState(row.id(), finalDraft, finalPos, deleted, actor);
          if (c.position() != null && neverPublished)
            blocks.setPositionDirect(row.id(), c.position());
        });
    touched.add(row.id());
    ops.add(
        Map.of(
            "id", row.id().toString(), "type", row.type(), "op", deleted && !row.draftDeleted() ? "delete" : "update"));
  }

  @Transactional
  public SaveResult discard(Jwt jwt, List<UUID> ids) {
    var actor = authz.require(jwt, Permission.CONTENT_EDIT).accountId();
    if (ids == null || ids.isEmpty() || ids.size() > 500) throw new IllegalArgumentException("ids");
    var rows = blocks.lock(new LinkedHashSet<>(ids));
    var removed = new ArrayList<UUID>();
    var ops = new ArrayList<Map<String, Object>>();
    for (var row : rows.values()) {
      if (row.published() == null) {
        blocks.delete(row.id());
        removed.add(row.id());
      } else {
        blocks.saveDraftState(row.id(), null, null, false, actor);
      }
      ops.add(Map.of("id", row.id().toString(), "type", row.type()));
    }
    audit.record(actor, "studio.discard", "studio", Map.of("blocks", ops));
    var kept = new ArrayList<>(rows.keySet());
    kept.removeAll(removed);
    return new SaveResult(blocks.byIds(kept).stream().map(Block::view).toList(), removed);
  }

  @Transactional(readOnly = true)
  public History history(Jwt jwt, UUID id) {
    authz.require(jwt, Permission.CONTENT_EDIT);
    blocks.find(id).orElseThrow(() -> StudioException.notFound("Block"));
    return new History(
        id,
        blocks.revisions(id).stream()
            .map(r -> new RevisionView(r.rev(), r.data(), r.createdBy(), r.createdAt()))
            .toList());
  }

  @Transactional
  public Block.View restore(Jwt jwt, UUID id, int rev) {
    var actor = authz.require(jwt, Permission.CONTENT_EDIT).accountId();
    var row = blocks.lock(Set.of(id)).get(id);
    if (row == null) throw StudioException.notFound("Block");
    var revision = blocks.revision(id, rev).orElseThrow(() -> StudioException.notFound("Revision"));
    JsonNode draft = revision.data().equals(row.published()) ? null : revision.data();
    blocks.saveDraftState(id, draft, row.draftPosition(), false, actor);
    audit.record(
        actor, "studio.restore", "studio", Map.of("id", id.toString(), "type", row.type(), "rev", rev));
    return blocks.find(id).orElseThrow().view();
  }

  private static void fail(
      List<Map<String, Object>> errors, int index, Change c, String path, String message) {
    var e = new LinkedHashMap<String, Object>();
    e.put("index", index);
    if (c.id() != null) e.put("id", c.id());
    e.put("path", path);
    e.put("message", message);
    errors.add(e);
  }
}
