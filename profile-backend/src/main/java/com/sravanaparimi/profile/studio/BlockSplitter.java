package com.sravanaparimi.profile.studio;

import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.JsonNodeFactory;

/** Cuts a SiteSnapshot content document into blocks, following the schema registry. */
@Component
public class BlockSplitter {
  private final SchemaRegistry registry;

  public BlockSplitter(SchemaRegistry registry) {
    this.registry = registry;
  }

  public List<BlockPart> split(JsonNode content) {
    var parts = new ArrayList<BlockPart>();
    for (var schema : registry.all()) {
      JsonNode node = content.path(schema.target());
      if (node.isMissingNode() || node.isNull()) continue;
      switch (schema.shape()) {
        case OBJECT ->
            parts.add(new BlockPart(schema.type(), null, schema.type(), 0, node.deepCopy()));
        case ITEM -> splitItems(schema, node, parts);
        case KEYED ->
            node.properties()
                .forEach(
                    e ->
                        parts.add(
                            new BlockPart(
                                schema.type(),
                                schema.collection(),
                                e.getKey(),
                                0,
                                e.getValue().deepCopy())));
        case MERGE -> splitMerged(schema, node, parts);
      }
    }
    return parts;
  }

  private void splitItems(StudioSchema schema, JsonNode array, List<BlockPart> parts) {
    var taken = new HashSet<String>();
    int i = 0;
    for (JsonNode item : array) {
      String base = Slugs.slugify(item.path(schema.slugFrom()).asString(""));
      if (base.isEmpty()) base = schema.type() + "-" + (i + 1);
      String slug = Slugs.unique(base, taken);
      taken.add(slug);
      parts.add(new BlockPart(schema.type(), schema.collection(), slug, i++, item.deepCopy()));
    }
  }

  private void splitMerged(StudioSchema schema, JsonNode map, List<BlockPart> parts) {
    var groups = new LinkedHashMap<String, tools.jackson.databind.node.ObjectNode>();
    map.properties()
        .forEach(
            e -> {
              String[] seg = e.getKey().split("\\.");
              String prefix = seg.length >= 2 ? seg[0] + "." + seg[1] : e.getKey();
              groups
                  .computeIfAbsent(prefix, k -> JsonNodeFactory.instance.objectNode())
                  .set(e.getKey(), e.getValue().deepCopy());
            });
    groups.forEach(
        (prefix, data) -> parts.add(new BlockPart(schema.type(), schema.collection(), prefix, 0, data)));
  }
}
