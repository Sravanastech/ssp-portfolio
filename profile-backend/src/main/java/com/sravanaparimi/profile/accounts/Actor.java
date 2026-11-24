package com.sravanaparimi.profile.accounts;

import java.util.Set;
import java.util.UUID;

/** The resolved admin caller for one request. */
public record Actor(UUID accountId, Role role, boolean canPublish, Set<Permission> permissions) {
  public boolean can(Permission p) {
    return permissions.contains(p);
  }
}
