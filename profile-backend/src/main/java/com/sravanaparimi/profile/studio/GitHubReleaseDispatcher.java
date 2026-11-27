package com.sravanaparimi.profile.studio;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

/**
 * Placeholder for the real workflow_dispatch call (milestone M3). Selected when a token is
 * configured; until M3 it refuses loudly instead of pretending a build started.
 */
@Component
@ConditionalOnExpression("!'${profile.github.dispatch-token:}'.isEmpty()")
public class GitHubReleaseDispatcher implements ReleaseDispatcher {
  @Override
  public void dispatch(long releaseId) {
    throw new IllegalStateException("GitHub dispatch is not implemented yet (milestone M3)");
  }
}
