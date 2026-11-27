package com.sravanaparimi.profile.studio;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Set;
import org.junit.jupiter.api.Test;

class SlugsTest {
  @Test
  void slugifyLowercasesAndHyphenates() {
    assertEquals("senior-swe-iii", Slugs.slugify("Senior SWE III!"));
    assertEquals("home", Slugs.slugify("  Home "));
    assertEquals("", Slugs.slugify("???"));
  }

  @Test
  void uniqueAppendsNumericSuffix() {
    assertEquals("a", Slugs.unique("a", Set.of()));
    assertEquals("a-2", Slugs.unique("a", Set.of("a")));
    assertEquals("a-3", Slugs.unique("a", Set.of("a", "a-2")));
  }

  @Test
  void validSlugPattern() {
    assertTrue(Slugs.isValid("/"));
    assertTrue(Slugs.isValid("/about"));
    assertTrue(Slugs.isValid("pages.HomePage"));
    assertFalse(Slugs.isValid(""));
    assertFalse(Slugs.isValid("-x"));
    assertFalse(Slugs.isValid("a b"));
    assertFalse(Slugs.isValid("x".repeat(121)));
  }
}
