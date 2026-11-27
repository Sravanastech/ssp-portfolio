package com.sravanaparimi.profile.studio;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class BlockValidatorTest {
  static final JsonMapper JSON = JsonMapper.builder().build();
  final BlockValidator validator = new BlockValidator(new SchemaRegistry(JSON), JSON);

  JsonNode n(String s) {
    return JSON.readTree(s);
  }

  static final String EXP =
      "{\"id\":\"experience-9\",\"year\":\"2016\",\"title\":\"Eng\",\"company\":\"Acme\","
          + "\"description\":\"Built things\"}";

  @Test
  void validBlockHasNoViolations() {
    assertTrue(validator.validate("experience", "experience-9", n(EXP)).isEmpty());
  }

  @Test
  void missingRequiredFieldIsReported() {
    var v = validator.validate("experience", "x", n("{\"id\":\"x\",\"title\":\"Eng\"}"));
    assertFalse(v.isEmpty());
  }

  @Test
  void tooLongTextIsReportedWithPath() {
    var tooLong = EXP.replace("Eng", "x".repeat(81));
    var v = validator.validate("experience", "experience-9", n(tooLong));
    assertTrue(v.stream().anyMatch(x -> x.path().contains("title")), v.toString());
  }

  @Test
  void wrongTypeAndUnknownFieldAreRejected() {
    assertFalse(validator.validate("profile", "profile", n("{\"name\":5}")).isEmpty());
    var extra = EXP.replace("}", ",\"surprise\":\"x\"}");
    assertFalse(validator.validate("experience", "experience-9", n(extra)).isEmpty());
  }

  @Test
  void patternViolationIsRejected() {
    var bad = EXP.replace("experience-9", "Bad Id!");
    assertFalse(validator.validate("experience", "x", n(bad)).isEmpty());
  }

  @Test
  void scriptCloseTagNulAndUnsafeUrlsAreRejected() {
    var script = EXP.replace("Built things", "x</ScRipt>y");
    assertFalse(validator.validate("experience", "experience-9", n(script)).isEmpty());
    var nav = "{\"href\":\"javascript:alert(1)\",\"label\":\"Home\"}";
    assertFalse(validator.validate("navigation_item", "home", n(nav)).isEmpty());
    var protocolRelative = "{\"href\":\"//evil.example\",\"label\":\"Home\"}";
    assertFalse(validator.validate("navigation_item", "home", n(protocolRelative)).isEmpty());
    assertTrue(
        validator
            .validate("navigation_item", "home", n("{\"href\":\"/about\",\"label\":\"About\"}"))
            .isEmpty());
    assertTrue(
        validator
            .validate("navigation_item", "x", n("{\"href\":\"https://a.example\",\"label\":\"A\"}"))
            .isEmpty());
  }

  @Test
  void pageTextKeysMustBelongToTheBlockSlug() {
    assertTrue(
        validator
            .validate("page_text", "pages.HomePage", n("{\"pages.HomePage.text.1\":\"Hi\"}"))
            .isEmpty());
    assertFalse(
        validator
            .validate("page_text", "pages.HomePage", n("{\"pages.AboutPage.text.1\":\"Hi\"}"))
            .isEmpty());
  }

  @Test
  void unknownTypeIsAViolation() {
    assertFalse(validator.validate("zzz", "a", n("{}")).isEmpty());
  }

  @Test
  void deeplyNestedDataIsRejected() {
    var deep = "{\"label\":\"a\",\"x\":" + "[".repeat(30) + "]".repeat(30) + "}";
    assertFalse(validator.validate("navigation_item", "a", n(deep)).isEmpty());
  }
}
