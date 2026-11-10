package com.sravanaparimi.profile.resumeaccess;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.LongSupplier;

/** Cheap in-memory token bucket per key. The map is bounded; least recently used keys are evicted. */
final class RequestThrottle {
  private static final long NANOS_PER_MINUTE = 60_000_000_000L;

  private static final class Bucket {
    double tokens;
    long lastNanos;
  }

  private final int perMinute;
  private final LongSupplier nanos;
  private final Map<String, Bucket> buckets;

  RequestThrottle(int perMinute, int maxKeys, LongSupplier nanos) {
    this.perMinute = perMinute;
    this.nanos = nanos;
    this.buckets =
        new LinkedHashMap<>(16, 0.75f, true) {
          @Override
          protected boolean removeEldestEntry(Map.Entry<String, Bucket> eldest) {
            return size() > maxKeys;
          }
        };
  }

  /** Returns 0 when allowed, otherwise the number of seconds until a token is available. */
  synchronized long tryAcquire(String key) {
    long now = nanos.getAsLong();
    Bucket b = buckets.get(key);
    if (b == null) {
      b = new Bucket();
      b.tokens = perMinute;
      b.lastNanos = now;
      buckets.put(key, b);
    } else {
      b.tokens = Math.min(perMinute, b.tokens + (now - b.lastNanos) * perMinute / (double) NANOS_PER_MINUTE);
      b.lastNanos = now;
    }
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return 0;
    }
    double missing = 1 - b.tokens;
    return Math.max(1, (long) Math.ceil(missing * NANOS_PER_MINUTE / perMinute / 1e9));
  }

  synchronized int size() {
    return new HashMap<>(buckets).size();
  }
}
