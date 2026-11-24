package com.sravanaparimi.profile.accounts;

import static com.sravanaparimi.profile.accounts.Permission.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.EnumSet;
import org.junit.jupiter.api.Test;

class RoleTest {
  @Test
  void ownerHasEverything() {
    assertEquals(EnumSet.allOf(Permission.class), Role.OWNER.permissions(false));
  }

  @Test
  void editorMatrix() {
    var drafts = Role.EDITOR.permissions(false);
    assertEquals(EnumSet.of(CONTENT_EDIT, MEDIA_UPLOAD, INQUIRIES_MANAGE, INSIGHTS_READ), drafts);
    var publisher = Role.EDITOR.permissions(true);
    assertTrue(publisher.contains(CONTENT_PUBLISH));
    for (var p : EnumSet.of(PEOPLE_READ, PEOPLE_MANAGE, TEAM_MANAGE, AUDIT_READ, SETTINGS_MANAGE))
      assertFalse(publisher.contains(p), p.code());
  }

  @Test
  void dbMapping() {
    assertNull(Role.fromDb(null));
    assertEquals(Role.EDITOR, Role.fromDb("editor"));
    assertEquals("owner", Role.OWNER.db());
    assertThrows(IllegalArgumentException.class, () -> Role.fromDb("root"));
  }
}
