package com.sravanaparimi.profile.studio;

import com.networknt.schema.dialect.Dialects;
import com.networknt.schema.keyword.NonValidationKeyword;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Loads content-schema/*.schema.json once at startup; a malformed file fails the boot. */
@Component
public class SchemaRegistry {
  private final Map<String, StudioSchema> byType;

  public SchemaRegistry(JsonMapper json) {
    var validatorRegistry =
        com.networknt.schema.SchemaRegistry.withDialect(
            com.networknt.schema.dialect.Dialect.builder(Dialects.getDraft202012())
                .keyword(new NonValidationKeyword("x-studio"))
                .keyword(new NonValidationKeyword("x-ui"))
                .build());
    var loaded = new TreeMap<String, StudioSchema>();
    try {
      for (Resource r :
          new PathMatchingResourcePatternResolver()
              .getResources("classpath*:content-schema/*.schema.json")) {
        JsonNode doc;
        try (InputStream in = r.getInputStream()) {
          doc = json.readTree(in);
        }
        var s = parse(String.valueOf(r.getFilename()), doc, validatorRegistry);
        if (loaded.put(s.type(), s) != null)
          throw new IllegalStateException("Duplicate content schema type " + s.type());
      }
    } catch (IOException e) {
      throw new IllegalStateException("Cannot read content schemas", e);
    }
    if (loaded.isEmpty()) throw new IllegalStateException("No content schemas on the classpath");
    byType = loaded;
  }

  private static StudioSchema parse(
      String file, JsonNode doc, com.networknt.schema.SchemaRegistry validatorRegistry) {
    JsonNode studio = doc.path("x-studio");
    String type = studio.path("type").asString("");
    String shape = studio.path("shape").asString("");
    String target = studio.path("target").asString("");
    if (type.isBlank()
        || shape.isBlank()
        || target.isBlank()
        || !file.equals(type + ".schema.json"))
      throw new IllegalStateException("Invalid x-studio block in " + file);
    var parsedShape = StudioSchema.Shape.parse(shape);
    String collection =
        studio.hasNonNull("collection") ? studio.get("collection").asString() : null;
    if (parsedShape != StudioSchema.Shape.OBJECT && collection == null)
      throw new IllegalStateException("collection required in " + file);
    return new StudioSchema(
        type,
        parsedShape,
        target,
        collection,
        studio.hasNonNull("slugFrom") ? studio.get("slugFrom").asString() : null,
        studio.path("order").asInt(100),
        doc,
        validatorRegistry.getSchema(doc));
  }

  public Optional<StudioSchema> get(String type) {
    return Optional.ofNullable(byType.get(type));
  }

  public List<StudioSchema> all() {
    return List.copyOf(byType.values());
  }
}
