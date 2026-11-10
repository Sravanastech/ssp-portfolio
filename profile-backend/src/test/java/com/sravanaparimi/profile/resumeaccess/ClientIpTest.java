package com.sravanaparimi.profile.resumeaccess;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientIpTest {
  static MockHttpServletRequest req(String remote, String... xff) {
    var r = new MockHttpServletRequest();
    r.setRemoteAddr(remote);
    for (String h : xff) r.addHeader("X-Forwarded-For", h);
    return r;
  }

  @Test
  void usesRightmostEntryByDefaultAndIgnoresSpoofedLeftmost() {
    assertEquals("203.0.113.7", ClientIp.resolve(req("10.0.0.1", "6.6.6.6, 203.0.113.7"), 1));
    assertEquals("203.0.113.7", ClientIp.resolve(req("10.0.0.1", "1.1.1.1, 2.2.2.2, 203.0.113.7"), 1));
  }

  @Test
  void honoursConfiguredProxyHopsFromTheRight() {
    assertEquals("2.2.2.2", ClientIp.resolve(req("10.0.0.1", "1.1.1.1, 2.2.2.2, 203.0.113.7"), 2));
  }

  @Test
  void multipleHeaderLinesAreTreatedAsOneList() {
    assertEquals("9.9.9.9", ClientIp.resolve(req("10.0.0.1", "6.6.6.6", "9.9.9.9"), 1));
  }

  @Test
  void neverFallsBackToLeftmostWhenChainIsShorterThanHops() {
    assertEquals("10.0.0.1", ClientIp.resolve(req("10.0.0.1", "6.6.6.6"), 2));
  }

  @Test
  void missingOrMalformedHeaderUsesRemoteAddress() {
    assertEquals("10.0.0.1", ClientIp.resolve(req("10.0.0.1"), 1));
    assertEquals("10.0.0.1", ClientIp.resolve(req("10.0.0.1", "not an ip!"), 1));
    assertEquals("10.0.0.1", ClientIp.resolve(req("10.0.0.1", "1.1.1.1,"), 0));
  }

  @Test
  void ipv6EntriesAreAccepted() {
    assertEquals(
        "2001:db8:0:0:0:0:0:1", ClientIp.resolve(req("10.0.0.1", "6.6.6.6, 2001:db8::1"), 1));
    assertEquals("1.2.3.4", ClientIp.resolve(req("10.0.0.1", "6.6.6.6, ::ffff:1.2.3.4"), 1));
  }

  @Test
  void capturedRawHeaderTakesPrecedenceWhenForwardedHeadersWereStripped() {
    var r = req("10.0.0.1");
    r.setAttribute(ClientIp.RAW_ATTRIBUTE, "6.6.6.6, 203.0.113.7");
    assertEquals("203.0.113.7", ClientIp.resolve(r, 1));
  }

  @Test
  void onlyStrictLiteralAddressesAreAcceptedWithoutNameLookups() {
    for (String bad :
        new String[] {
          "example.com", "cafe.babe", "abc", "ab", "1.2.3", "1.2.3.4.5", "256.1.1.1", "01.2.3.4",
          "1.2.3.4a", "1::2::3", "fe80::1%eth0", "::g", "1:2:3:4:5:6:7:8:9", "..", "::.."
        }) {
      assertEquals("10.0.0.1", ClientIp.resolve(req("10.0.0.1", "6.6.6.6, " + bad), 1), bad);
    }
    assertEquals("0.0.0.0", ClientIp.resolve(req("10.0.0.1", "0.0.0.0"), 1));
    assertEquals("255.255.255.255", ClientIp.resolve(req("10.0.0.1", "255.255.255.255"), 1));
  }

  @Test
  void bucketKeyCollapsesIpv6To64AndLeavesIpv4Alone() {
    assertEquals("203.0.113.7", ClientIp.bucketKey("203.0.113.7"));
    assertEquals(
        ClientIp.bucketKey("2001:db8:0:1:0:0:0:1"), ClientIp.bucketKey("2001:db8:0:1:ffff::2"));
    assertNotEquals(ClientIp.bucketKey("2001:db8:0:1::1"), ClientIp.bucketKey("2001:db8:0:2::1"));
    assertEquals("not-an-ip", ClientIp.bucketKey("not-an-ip"));
  }
}
