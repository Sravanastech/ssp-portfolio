package com.sravanaparimi.profile.studio;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class SchemaRegistryTest {
  static final JsonMapper JSON = JsonMapper.builder().build();
  final SchemaRegistry registry = new SchemaRegistry(JSON);

  @Test
  void loadsEveryBundledSchemaWithItsStudioMetadata() {
    Set<String> types = registry.all().stream().map(StudioSchema::type).collect(Collectors.toSet());
    assertEquals(
        Set.of(
            "profile",
            "experience",
            "expertise_group",
            "case_study",
            "work_project",
            "navigation_item",
            "seo_page",
            "page_text"),
        types);
    var experience = registry.get("experience").orElseThrow();
    assertEquals(StudioSchema.Shape.ITEM, experience.shape());
    assertEquals("experiences", experience.target());
    assertEquals("experiences", experience.collection());
    assertEquals("id", experience.slugFrom());
    assertNull(registry.get("profile").orElseThrow().collection());
  }

  @Test
  void unknownTypeIsAbsent() {
    assertTrue(registry.get("nope").isEmpty());
  }

  @Test
  void documentsExposeUiHintsVerbatim() {
    var doc = registry.get("experience").orElseThrow().document();
    assertEquals("Job title", doc.at("/properties/title/x-ui/label").asString());
    assertEquals("{{title}} · {{company}}", doc.at("/x-studio/itemTitle").asString());
  }
}
