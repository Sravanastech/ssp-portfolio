package com.sravanaparimi.profile.studio;

import static org.junit.jupiter.api.Assertions.*;

import java.io.InputStream;
import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class SnapshotRoundTripTest {
  static final JsonMapper JSON = JsonMapper.builder().build();
  final SchemaRegistry registry = new SchemaRegistry(JSON);
  final BlockSplitter splitter = new BlockSplitter(registry);
  final SnapshotAssembler assembler = new SnapshotAssembler(registry, JSON);
  final BlockValidator validator = new BlockValidator(registry, JSON);

  JsonNode portfolio() throws Exception {
    try (InputStream in = getClass().getResourceAsStream("/seed/portfolio.json")) {
      return JSON.readTree(in);
    }
  }

  @Test
  void splitThenAssembleEqualsTheOriginalContent() throws Exception {
    var original = portfolio();
    assertEquals(original, assembler.assemble(splitter.split(original)));
  }

  @Test
  void assembledKeysFollowTheSnapshotOrder() throws Exception {
    var keys = new ArrayList<String>();
    assembler.assemble(splitter.split(portfolio())).propertyNames().forEach(keys::add);
    assertEquals(
        List.of(
            "seo",
            "copy",
            "profile",
            "navigation",
            "caseStudies",
            "experiences",
            "workProjects",
            "expertiseData"),
        keys);
  }

  @Test
  void blockGranularityMatchesTheDesign() throws Exception {
    var parts = splitter.split(portfolio());
    Map<String, Long> byType = new TreeMap<>();
    parts.forEach(p -> byType.merge(p.type(), 1L, Long::sum));
    assertEquals(1L, byType.get("profile"));
    assertEquals(6L, byType.get("seo_page"));
    assertEquals(6L, byType.get("experience"));
    assertEquals(5L, byType.get("case_study"));
    assertEquals(6L, byType.get("work_project"));
    assertEquals(8L, byType.get("expertise_group"));
    assertEquals(4L, byType.get("navigation_item"));
    assertEquals(11L, byType.get("page_text"));
    assertTrue(
        parts.stream().anyMatch(p -> p.type().equals("page_text") && p.slug().equals("pages.HomePage")));
    assertTrue(
        parts.stream()
            .anyMatch(p -> p.type().equals("page_text") && p.slug().equals("components.Footer")));
  }

  @Test
  void itemPositionsFollowArrayOrderAndSlugsAreUniquePerType() throws Exception {
    var parts = splitter.split(portfolio());
    var experiences = parts.stream().filter(p -> p.type().equals("experience")).toList();
    for (int i = 0; i < experiences.size(); i++) assertEquals(i, experiences.get(i).position());
    var seen = new HashSet<String>();
    for (var p : parts) assertTrue(seen.add(p.type() + "/" + p.slug()), p.slug());
  }

  @Test
  void everyImportedBlockPassesItsOwnSchema() throws Exception {
    for (var p : splitter.split(portfolio())) {
      var violations = validator.validate(p.type(), p.slug(), p.data());
      assertTrue(violations.isEmpty(), p.type() + "/" + p.slug() + " " + violations);
    }
  }

  @Test
  void assemblyOrdersItemsByPositionNotInputOrder() throws Exception {
    var parts = new ArrayList<>(splitter.split(portfolio()));
    Collections.reverse(parts);
    assertEquals(portfolio(), assembler.assemble(parts));
  }
}
