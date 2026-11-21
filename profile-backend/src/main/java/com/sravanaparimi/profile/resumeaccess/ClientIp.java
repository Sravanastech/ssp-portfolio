package com.sravanaparimi.profile.resumeaccess;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Resolves the client address as the Nth-from-right X-Forwarded-For entry. The leftmost entry is
 * client-controlled and must never be trusted.
 */
@Component
public class ClientIp {
  /** Request attribute holding the raw header, captured before Spring strips forwarded headers. */
  public static final String RAW_ATTRIBUTE = "profile.resume-otp.raw-xff";

  private static final String OCTET = "(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])";
  private static final Pattern IPV4 =
      Pattern.compile(OCTET + "\\." + OCTET + "\\." + OCTET + "\\." + OCTET);
  private static final Pattern IPV6_CHARS = Pattern.compile("[0-9a-fA-F:.]{2,45}");
  private final int hops;

  public ClientIp(Environment env) {
    this.hops = env.getProperty("profile.resume-otp.trusted-proxy-hops", Integer.class, 1);
  }

  public String resolve(HttpServletRequest request) {
    return resolve(request, hops);
  }

  static String resolve(HttpServletRequest request, int hops) {
    String raw =
        request.getAttribute(RAW_ATTRIBUTE) instanceof String s
            ? s
            : String.join(",", Collections.list(request.getHeaders("X-Forwarded-For")));
    List<String> parts =
        Arrays.stream(raw.split(",")).map(s -> s.trim()).filter(p -> !p.isEmpty()).toList();
    if (hops >= 1 && parts.size() >= hops) {
      String literal = literal(parts.get(parts.size() - hops));
      if (literal != null) return literal;
    }
    return request.getRemoteAddr();
  }

  /**
   * Returns the canonical form of a literal IP address, or null. Never performs a DNS lookup: IPv4
   * must be strict dotted decimal; anything else must contain ':' and only hex, colon and dot
   * characters before it is parsed as an IPv6 literal.
   */
  static String literal(String candidate) {
    if (candidate.indexOf(':') < 0) return IPV4.matcher(candidate).matches() ? candidate : null;
    if (!IPV6_CHARS.matcher(candidate).matches()) return null;
    try {
      return InetAddress.getByName(candidate).getHostAddress();
    } catch (UnknownHostException ex) {
      return null;
    }
  }

  /** Rate-limit and hash key: IPv6 addresses collapse to their /64, IPv4 is unchanged. */
  static String bucketKey(String ip) {
    if (ip == null) return "";
    String literal = ip.indexOf(':') >= 0 ? literal(ip) : null;
    if (literal == null) return ip;
    try {
      byte[] raw = InetAddress.getByName(literal).getAddress();
      if (raw.length != 16) return literal;
      return HexFormat.of().formatHex(raw, 0, 8) + "/64";
    } catch (UnknownHostException ex) {
      return ip;
    }
  }
}
