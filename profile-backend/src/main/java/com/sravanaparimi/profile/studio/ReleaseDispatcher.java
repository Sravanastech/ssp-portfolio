package com.sravanaparimi.profile.studio;

/**
 * Tells the build system to deploy a release snapshot. Called after the release transaction has
 * committed. Throwing marks the release failed; it never rolls back the publish.
 */
public interface ReleaseDispatcher {
  void dispatch(long releaseId) throws Exception;
}
