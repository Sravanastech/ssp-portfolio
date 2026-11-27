package com.sravanaparimi.profile.studio;

import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

/** Used when no GitHub token is configured: no network call, only a log line and a record. */
@Component
@ConditionalOnExpression("'${profile.github.dispatch-token:}'.isEmpty()")
public class LoggingReleaseDispatcher implements ReleaseDispatcher {
  private static final Logger log = LoggerFactory.getLogger(LoggingReleaseDispatcher.class);
  private static final int KEEP = 20;
  private final List<Long> dispatched = new ArrayList<>();

  @Override
  public synchronized void dispatch(long releaseId) {
    log.info("Release {} queued; no GitHub dispatch token configured, build not triggered", releaseId);
    dispatched.add(releaseId);
    if (dispatched.size() > KEEP) dispatched.removeFirst();
  }

  /** The most recent release ids this instance was asked to dispatch (for diagnostics and tests). */
  public synchronized List<Long> dispatched() {
    return List.copyOf(dispatched);
  }
}
