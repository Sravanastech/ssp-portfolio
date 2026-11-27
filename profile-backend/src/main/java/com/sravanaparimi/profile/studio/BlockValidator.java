package com.sravanaparimi.profile.studio;

import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** JSON Schema validation plus the content-safety rules every block must pass. */
@Component
public class BlockValidator {
  public record Violation(String path, String message) {}

  static final int MAX_DEPTH = 12;
  static final int MAX_BYTES = 100_000;
  private static final Set<String> URL_FIELDS = Set.of("url", "linkedin", "href", "src");

  private final SchemaRegistry registry;
  private final JsonMapper json;

  public BlockValidator(SchemaRegistry registry, JsonMapper json) {
    this.registry = registry;
    this.json = json;
  }

  public List<Violation> validate(String type, String slug, JsonNode data) {
    var schema = registry.get(type);
    if (schema.isEmpty()) return List.of(new Violation("$", "Unknown block type"));
    if (data == null || data.isNull()) return List.of(new Violation("$", "Content is required"));
    var out = new ArrayList<Violation>();
    if (json.writeValueAsBytes(data).length > MAX_BYTES)
      return List.of(new Violation("$", "Content too large"));
    if (depth(data) > MAX_DEPTH) return List.of(new Violation("$", "Content nesting too deep"));
    for (var e : schema.get().compiled().validate(data))
      out.add(new Violation(e.getInstanceLocation().toString(), e.getMessage()));
    if (!out.isEmpty()) return out;
    scan(data, "$", null, out);
    if (schema.get().shape() == StudioSchema.Shape.MERGE)
      data.propertyNames().stream()
          .filter(k -> !k.startsWith(slug + "."))
          .forEach(k -> out.add(new Violation("$." + k, "Key must start with " + slug + ".")));
    return out;
  }

  private static int depth(JsonNode n) {
    int d = 0;
    for (JsonNode c : n) d = Math.max(d, depth(c));
    return n.isContainer() ? d + 1 : d;
  }

  private void scan(JsonNode n, String path, String field, List<Violation> out) {
    if (n.isObject()) {
      n.properties().forEach(e -> scan(e.getValue(), path + "." + e.getKey(), e.getKey(), out));
    } else if (n.isArray()) {
      int i = 0;
      for (JsonNode c : n) scan(c, path + "[" + i++ + "]", field, out);
    } else if (n.isString()) {
      String s = n.asString();
      if (s.indexOf(0) >= 0 || s.toLowerCase(Locale.ROOT).contains("</script"))
        out.add(new Violation(path, "Text contains disallowed content"));
      else if (field != null && URL_FIELDS.contains(field) && !safeUrl(s))
        out.add(new Violation(path, "Use an https:// address or a path on this site"));
    }
  }

  static boolean safeUrl(String s) {
    return s.startsWith("https://")
        || s.startsWith("/api/media/public/")
        || (s.startsWith("/") && !s.startsWith("//") && !s.contains(".."));
  }
}
