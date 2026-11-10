package com.sravanaparimi.profile.resumeaccess;

import static org.junit.jupiter.api.Assertions.*;

import java.security.SecureRandom;
import java.util.*;
import org.junit.jupiter.api.Test;

class OtpCryptoTest {
  static final String SECRET = "unit-test-secret-0123456789-abcdefghij";

  static OtpCrypto crypto() {
    return OtpCrypto.of(SECRET, false);
  }

  @Test
  void codesAreSixDigitsAndKeepLeadingZeros() {
    var c = crypto();
    boolean sawLeadingZero = false;
    for (int i = 0; i < 5000; i++) {
      String code = c.generateCode();
      assertTrue(code.matches("[0-9]{6}"), code);
      sawLeadingZero |= code.startsWith("0");
    }
    assertTrue(sawLeadingZero);
  }

  @Test
  void codeDistributionIsRoughlyUniformPerLeadingDigit() {
    var c = crypto();
    int[] buckets = new int[10];
    int n = 20000;
    for (int i = 0; i < n; i++) buckets[c.generateCode().charAt(0) - '0']++;
    for (int b : buckets) assertTrue(b > n / 10 * 0.8 && b < n / 10 * 1.2, Arrays.toString(buckets));
  }

  @Test
  void rejectionSamplingDiscardsOutOfRangeDraws() {
    // First draw 0xFFFFF (>= 1_000_000, rejected) then 0x00007 -> "000007".
    var scripted =
        new SecureRandom() {
          final Iterator<byte[]> draws =
              List.of(new byte[] {0x0F, (byte) 0xFF, (byte) 0xFF}, new byte[] {0, 0, 7}).iterator();

          @Override
          public void nextBytes(byte[] bytes) {
            System.arraycopy(draws.next(), 0, bytes, 0, bytes.length);
          }
        };
    assertEquals("000007", OtpCrypto.of(SECRET, false, scripted).generateCode());
  }

  @Test
  void subkeysDifferAndHaveFixedLength() {
    var c = crypto();
    assertEquals(32, c.codeKey().length);
    assertEquals(32, c.tokenKey().length);
    assertFalse(Arrays.equals(c.codeKey(), c.tokenKey()));
    assertFalse(Arrays.equals(c.codeKey(), SECRET.getBytes()));
  }

  @Test
  void differentSecretsGiveDifferentSubkeys() {
    var other = OtpCrypto.of(SECRET + "x", false);
    assertFalse(Arrays.equals(crypto().tokenKey(), other.tokenKey()));
  }

  @Test
  void hmacIsBoundToCodeAndChallengeAndComparesConstantTime() {
    var c = crypto();
    var id = UUID.randomUUID();
    byte[] h = c.hmac("123456", id);
    assertTrue(c.matches("123456", id, h));
    assertFalse(c.matches("123457", id, h));
    assertFalse(c.matches("123456", UUID.randomUUID(), h));
    assertFalse(c.matches("123456", id, new byte[] {1}));
  }

  @Test
  void shortSecretIsRejected() {
    assertThrows(IllegalStateException.class, () -> OtpCrypto.of("short", false));
    assertThrows(IllegalStateException.class, () -> OtpCrypto.of("", false));
    assertThrows(IllegalStateException.class, () -> OtpCrypto.of(null, false));
  }

  @Test
  void devSecretIsRejectedInProductionOnly() {
    assertDoesNotThrow(() -> OtpCrypto.of(OtpCrypto.DEV_SECRET, false));
    assertThrows(IllegalStateException.class, () -> OtpCrypto.of(OtpCrypto.DEV_SECRET, true));
    assertDoesNotThrow(() -> OtpCrypto.of(SECRET, true));
  }
}
