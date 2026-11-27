package com.sravanaparimi.profile.studio;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * Starts the deploy workflow for a release through the GitHub workflow_dispatch API. The token is
 * only ever sent in the Authorization header and is never logged.
 */
@Component
@ConditionalOnExpression("!'${profile.github.dispatch-token:}'.isEmpty()")
public class GitHubReleaseDispatcher implements ReleaseDispatcher {
  private static final Logger log = LoggerFactory.getLogger(GitHubReleaseDispatcher.class);
  private static final Pattern NAME = Pattern.compile("[A-Za-z0-9._-]{1,100}");

  private final String token;
  private final String owner;
  private final String repo;
  private final String apiBase;
  private final String callbackBase;
  private final ReleaseTokens tokens;
  private final JsonMapper json;
  private final HttpClient http;

  @Autowired
  public GitHubReleaseDispatcher(
      @Value("${profile.github.dispatch-token}") String token,
      @Value("${profile.github.owner:Sravanastech}") String owner,
      @Value("${profile.github.repo:ssp-portfolio}") String repo,
      @Value("${profile.github.api-base:https://api.github.com}") String apiBase,
      @Value("${profile.github.callback-base:}") String callbackBase,
      ReleaseTokens tokens,
      JsonMapper json) {
    this.token = token.strip();
    this.owner = owner.strip();
    this.repo = repo.strip();
    this.apiBase = apiBase.strip().replaceAll("/+$", "");
    this.callbackBase = callbackBase.strip().replaceAll("/+$", "");
    this.tokens = tokens;
    this.json = json;
    this.http =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
  }

  @Override
  public void dispatch(long releaseId) throws Exception {
    if (!NAME.matcher(owner).matches() || !NAME.matcher(repo).matches())
      throw new IllegalStateException("Invalid profile.github.owner/repo");
    if (callbackBase.isEmpty())
      throw new IllegalStateException("profile.github.callback-base is not set");
    if (!tokens.configured())
      throw new IllegalStateException("profile.github.callback-secret is missing or too short");
    long expires = tokens.newExpiry();
    Map<String, Object> inputs = new LinkedHashMap<>();
    inputs.put("release_id", Long.toString(releaseId));
    inputs.put("release_token", tokens.sign(releaseId, expires));
    inputs.put("release_expires", Long.toString(expires));
    inputs.put("callback_base", callbackBase);
    var body = json.writeValueAsString(Map.of("ref", "main", "inputs", inputs));
    var request =
        HttpRequest.newBuilder(
                URI.create(
                    apiBase
                        + "/repos/"
                        + owner
                        + "/"
                        + repo
                        + "/actions/workflows/deploy.yml/dispatches"))
            .timeout(Duration.ofSeconds(15))
            .header("Authorization", "Bearer " + token)
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "profile-backend")
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
    var response = http.send(request, HttpResponse.BodyHandlers.discarding());
    int status = response.statusCode();
    if (status / 100 != 2) {
      throw new IllegalStateException("GitHub workflow dispatch returned HTTP " + status);
    }
    log.info("Release {} dispatched to {}/{} (HTTP {})", releaseId, owner, repo, status);
  }
}
