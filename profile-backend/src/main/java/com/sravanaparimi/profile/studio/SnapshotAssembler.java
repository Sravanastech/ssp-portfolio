package com.sravanaparimi.profile.studio;

import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Builds the SiteSnapshot content document the UI consumes from a set of blocks. */
@Component
public class SnapshotAssembler {
  /** Key order of the content the site has always served. */
  static final List<String> KEY_ORDER =
      List.of(
          "seo",
          "copy",
          "profile",
          "navigation",
          "caseStudies",
          "experiences",
          "workProjects",
          "expertiseData");

  private final SchemaRegistry registry;
  private final JsonMapper json;

  public SnapshotAssembler(SchemaRegistry registry, JsonMapper json) {
    this.registry = registry;
    this.json = json;
  }

  public ObjectNode assemble(Collection<BlockPart> parts) {
    var targets = new LinkedHashMap<String, StudioSchema.Shape>();
    for (String k : KEY_ORDER) targets.put(k, null);
    for (var s : registry.all()) targets.put(s.target(), s.shape());
    var byTarget = new HashMap<String, List<BlockPart>>();
    for (var p : parts) {
      var schema = registry.get(p.type());
      if (schema.isPresent())
        byTarget.computeIfAbsent(schema.get().target(), k -> new ArrayList<>()).add(p);
    }
    var out = json.createObjectNode();
    targets.forEach(
        (target, shape) -> {
          if (shape == null) return;
          var list = byTarget.getOrDefault(target, List.of());
          switch (shape) {
            case OBJECT -> list.stream().findFirst().ifPresent(p -> out.set(target, p.data()));
            case ITEM -> {
              var arr = out.putArray(target);
              list.stream()
                  .sorted(
                      Comparator.comparingInt(BlockPart::position).thenComparing(BlockPart::slug))
                  .forEach(p -> arr.add(p.data()));
            }
            case KEYED -> {
              var obj = out.putObject(target);
              list.stream()
                  .sorted(Comparator.comparing(BlockPart::slug))
                  .forEach(p -> obj.set(p.slug(), p.data()));
            }
            case MERGE -> {
              var obj = out.putObject(target);
              list.stream()
                  .sorted(Comparator.comparing(BlockPart::slug))
                  .forEach(p -> p.data().properties().forEach(e -> obj.set(e.getKey(), e.getValue())));
            }
          }
        });
    return out;
  }
}
