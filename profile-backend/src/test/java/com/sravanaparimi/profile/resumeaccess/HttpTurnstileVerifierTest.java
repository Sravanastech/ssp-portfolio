package com.sravanaparimi.profile.resumeaccess;

import static org.junit.jupiter.api.Assertions.*;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.*;
import tools.jackson.databind.json.JsonMapper;

class HttpTurnstileVerifierTest {
  static HttpServer server;
  static final AtomicReference<String> lastBody = new AtomicReference<>();
  static final AtomicReference<String> lastContentType = new AtomicReference<>();
  static final AtomicInteger calls = new AtomicInteger();
  static volatile int status = 200;
  static volatile String response = "";
  static volatile long delayMs = 0;

  @BeforeAll
  static void start() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/siteverify",
        ex -> {
          calls.incrementAndGet();
          lastBody.set(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
          lastContentType.set(ex.getRequestHeaders().getFirst("Content-Type"));
          try {
            Thread.sleep(delayMs);
          } catch (InterruptedException ignored) {
          }
          byte[] data = response.getBytes(StandardCharsets.UTF_8);
          ex.getResponseHeaders().set("Content-Type", "application/json");
          try {
            ex.sendResponseHeaders(status, data.length);
            ex.getResponseBody().write(data);
          } catch (IOException ignored) {
          } finally {
            ex.close();
          }
        });
    server.start();
  }

  @AfterAll
  static void stop() {
    server.stop(0);
  }

  @BeforeEach
  void reset() {
    status = 200;
    delayMs = 0;
    calls.set(0);
    lastBody.set(null);
    response = "{\"success\":true,\"hostname\":\"sravanasparimi.com\",\"action\":\"resume_otp\"}";
  }

  HttpTurnstileVerifier verifier(boolean enabled, boolean requireAction, Duration timeout) {
    return new HttpTurnstileVerifier(
        enabled,
        "test-secret",
        List.of("sravanasparimi.com", "www.sravanasparimi.com"),
        requireAction,
        URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/siteverify"),
        timeout,
        JsonMapper.builder().build());
  }

  HttpTurnstileVerifier verifier() {
    return verifier(true, true, Duration.ofSeconds(3));
  }

  @Test
  void validResponseIsAcceptedAndRequestIsFormEncodedWithSecretAndIp() {
    assertTrue(verifier().verify("tok en", "203.0.113.9"));
    assertEquals(1, calls.get());
    assertTrue(lastContentType.get().startsWith("application/x-www-form-urlencoded"));
    assertTrue(lastBody.get().contains("secret=test-secret"));
    assertTrue(lastBody.get().contains("response=tok+en") || lastBody.get().contains("response=tok%20en"));
    assertTrue(lastBody.get().contains("remoteip=203.0.113.9"));
  }

  @Test
  void remoteIpIsOptional() {
    assertTrue(verifier().verify("tok", null));
    assertFalse(lastBody.get().contains("remoteip"));
  }

  @Test
  void unsuccessfulResponseIsRejected() {
    response = "{\"success\":false,\"error-codes\":[\"invalid-input-response\"]}";
    assertFalse(verifier().verify("tok", "1.2.3.4"));
  }

  @Test
  void hostnameMustBeAllowed() {
    response = "{\"success\":true,\"hostname\":\"evil.example\",\"action\":\"resume_otp\"}";
    assertFalse(verifier().verify("tok", "1.2.3.4"));
    response = "{\"success\":true,\"action\":\"resume_otp\"}";
    assertFalse(verifier().verify("tok", "1.2.3.4"));
  }

  @Test
  void actionMustMatchWhenRequired() {
    response = "{\"success\":true,\"hostname\":\"sravanasparimi.com\",\"action\":\"other\"}";
    assertFalse(verifier().verify("tok", "1.2.3.4"));
    response = "{\"success\":true,\"hostname\":\"sravanasparimi.com\"}";
    assertFalse(verifier().verify("tok", "1.2.3.4"));
  }

  @Test
  void callerSuppliedActionIsEnforced() {
    response = "{\"success\":true,\"hostname\":\"sravanasparimi.com\",\"action\":\"contact\"}";
    assertTrue(verifier().verify("tok", "1.2.3.4", "contact"));
    assertFalse(verifier().verify("tok", "1.2.3.4"));
    assertFalse(verifier().verify("tok", "1.2.3.4", "resume_otp"));
  }

  @Test
  void missingActionIsToleratedOnlyWhenNotRequired() {
    response = "{\"success\":true,\"hostname\":\"sravanasparimi.com\"}";
    assertTrue(verifier(true, false, Duration.ofSeconds(3)).verify("tok", "1.2.3.4"));
    // A present but wrong action is still rejected.
    response = "{\"success\":true,\"hostname\":\"sravanasparimi.com\",\"action\":\"other\"}";
    assertFalse(verifier(true, false, Duration.ofSeconds(3)).verify("tok", "1.2.3.4"));
  }

  @Test
  void failsClosedOnTimeoutServerErrorAndMalformedBody() {
    delayMs = 1500;
    assertFalse(verifier(true, true, Duration.ofMillis(200)).verify("tok", "1.2.3.4"));
    delayMs = 0;
    status = 500;
    assertFalse(verifier().verify("tok", "1.2.3.4"));
    status = 200;
    response = "not json";
    assertFalse(verifier().verify("tok", "1.2.3.4"));
  }

  @Test
  void unreachableServiceFailsClosed() {
    var v =
        new HttpTurnstileVerifier(
            true,
            "s",
            List.of("sravanasparimi.com"),
            true,
            URI.create("http://127.0.0.1:1/siteverify"),
            Duration.ofMillis(300),
            JsonMapper.builder().build());
    assertFalse(v.verify("tok", "1.2.3.4"));
  }

  @Test
  void blankOrOversizedTokensNeverReachCloudflare() {
    assertFalse(verifier().verify(null, "1.2.3.4"));
    assertFalse(verifier().verify("  ", "1.2.3.4"));
    assertFalse(verifier().verify("x".repeat(2049), "1.2.3.4"));
    assertEquals(0, calls.get());
  }

  @Test
  void disabledVerifierAcceptsWithoutCallingOut() {
    assertTrue(verifier(false, true, Duration.ofSeconds(3)).verify("anything", "1.2.3.4"));
    assertEquals(0, calls.get());
  }
}
