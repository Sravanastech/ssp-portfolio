package com.sravanaparimi.profile.resumeaccess;

import static org.junit.jupiter.api.Assertions.*;

import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class RequestThrottleTest {
  static final long SECOND = 1_000_000_000L;

  @Test
  void allowsABurstThenDeniesWithRetryAfter() {
    var clock = new AtomicLong();
    var t = new RequestThrottle(10, 100, clock::get);
    for (int i = 0; i < 10; i++) assertEquals(0, t.tryAcquire("a"));
    long wait = t.tryAcquire("a");
    assertTrue(wait >= 1 && wait <= 6, "" + wait);
  }

  @Test
  void keysAreIndependent() {
    var t = new RequestThrottle(2, 100, () -> 0L);
    assertEquals(0, t.tryAcquire("a"));
    assertEquals(0, t.tryAcquire("a"));
    assertTrue(t.tryAcquire("a") > 0);
    assertEquals(0, t.tryAcquire("b"));
  }

  @Test
  void tokensRefillOverTime() {
    var clock = new AtomicLong();
    var t = new RequestThrottle(10, 100, clock::get);
    for (int i = 0; i < 10; i++) t.tryAcquire("a");
    assertTrue(t.tryAcquire("a") > 0);
    clock.addAndGet(6 * SECOND);
    assertEquals(0, t.tryAcquire("a"));
    assertTrue(t.tryAcquire("a") > 0);
    clock.addAndGet(120 * SECOND);
    for (int i = 0; i < 10; i++) assertEquals(0, t.tryAcquire("a"));
    assertTrue(t.tryAcquire("a") > 0);
  }

  @Test
  void mapStaysBoundedByEvictingTheLeastRecentlyUsedKey() {
    var t = new RequestThrottle(5, 10, () -> 0L);
    for (int i = 0; i < 1000; i++) t.tryAcquire("ip-" + i);
    assertTrue(t.size() <= 10, "" + t.size());
  }
}
