package com.sravanaparimi.profile.resumeaccess;

import jakarta.servlet.http.HttpServletRequest;
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

  private static final Pattern IP_LIKE = Pattern.compile("[0-9a-fA-F:.]{2,45}");
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
        Arrays.stream(raw.split(",")).map(String::trim).filter(p -> !p.isEmpty()).toList();
    if (hops >= 1 && parts.size() >= hops) {
      String candidate = parts.get(parts.size() - hops);
      if (IP_LIKE.matcher(candidate).matches()) return candidate;
    }
    return request.getRemoteAddr();
  }
}
