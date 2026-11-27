package com.sravanaparimi.profile.studio;

import static org.junit.jupiter.api.Assertions.*;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class GitHubReleaseDispatcherTest {
  static final String SECRET = "unit-test-callback-secret-0123456789";
  static final JsonMapper json = JsonMapper.builder().build();

  HttpServer server;
  int status;
  final AtomicReference<String> path = new AtomicReference<>();
  final AtomicReference<String> auth = new AtomicReference<>();
  final AtomicReference<String> body = new AtomicReference<>();

  @BeforeEach
  void start() throws Exception {
    status = 204;
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/",
        ex -> {
          path.set(ex.getRequestMethod() + " " + ex.getRequestURI().getPath());
          auth.set(ex.getRequestHeaders().getFirst("Authorization"));
          body.set(new String(ex.getRequestBody().readAllBytes()));
          ex.sendResponseHeaders(status, -1);
          ex.close();
        });
    server.start();
  }

  @AfterEach
  void stop() {
    server.stop(0);
  }

  GitHubReleaseDispatcher dispatcher(String callbackBase, String secret) {
    return new GitHubReleaseDispatcher(
        "ghp_secret_token_value",
        "Sravanastech",
        "ssp-portfolio",
        "http://127.0.0.1:" + server.getAddress().getPort() + "/",
        callbackBase,
        new ReleaseTokens(secret),
        json);
  }

  @Test
  void postsWorkflowDispatchWithRefAndInputs() throws Exception {
    dispatcher("https://api.example.com/", SECRET).dispatch(42);
    assertEquals(
        "POST /repos/Sravanastech/ssp-portfolio/actions/workflows/deploy.yml/dispatches",
        path.get());
    assertEquals("Bearer ghp_secret_token_value", auth.get());
    JsonNode b = json.readTree(body.get());
    assertEquals("main", b.get("ref").asString());
    var in = b.get("inputs");
    assertEquals("42", in.get("release_id").asString());
    assertEquals("https://api.example.com", in.get("callback_base").asString());
    long exp = Long.parseLong(in.get("release_expires").asString());
    assertTrue(new ReleaseTokens(SECRET).verify(42, in.get("release_token").asString(), exp));
  }

  @Test
  void nonSuccessResponseThrowsWithoutLeakingTheToken() {
    status = 403;
    var e = assertThrows(Exception.class, () -> dispatcher("https://api.example.com", SECRET).dispatch(1));
    assertTrue(e.getMessage().contains("403"));
    assertFalse(e.getMessage().contains("ghp_secret_token_value"));
  }

  @Test
  void refusesToDispatchWithoutCallbackBaseOrSecret() {
    assertThrows(IllegalStateException.class, () -> dispatcher("", SECRET).dispatch(1));
    assertThrows(
        IllegalStateException.class, () -> dispatcher("https://api.example.com", "").dispatch(1));
    assertNull(path.get(), "no request was made");
  }
}
