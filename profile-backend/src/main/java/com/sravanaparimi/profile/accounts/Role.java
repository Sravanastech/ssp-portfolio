package com.sravanaparimi.profile.accounts;

import static com.sravanaparimi.profile.accounts.Permission.*;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;

/** The whole admin policy. owner = everything; editor = content work, optionally publish. */
public enum Role {
  OWNER,
  EDITOR;

  public Set<Permission> permissions(boolean canPublish) {
    if (this == OWNER) return Collections.unmodifiableSet(EnumSet.allOf(Permission.class));
    var p = EnumSet.of(CONTENT_EDIT, MEDIA_UPLOAD, INQUIRIES_MANAGE, INSIGHTS_READ);
    if (canPublish) p.add(CONTENT_PUBLISH);
    return Collections.unmodifiableSet(p);
  }

  public String db() {
    return name().toLowerCase(Locale.ROOT);
  }

  public static Role fromDb(String value) {
    return value == null ? null : valueOf(value.toUpperCase(Locale.ROOT));
  }
}
