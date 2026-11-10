package com.sravanaparimi.profile.resumeaccess;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Collections;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * Stashes the raw X-Forwarded-For value before ForwardedHeaderFilter (forward-headers-strategy:
 * framework) removes the header from the request.
 */
@Configuration
class ClientIpCaptureFilter {
  @Bean
  FilterRegistrationBean<Filter> clientIpCapture() {
    Filter filter =
        (req, res, chain) -> {
          if (req instanceof HttpServletRequest http) {
            var values = Collections.list(http.getHeaders("X-Forwarded-For"));
            if (!values.isEmpty()) req.setAttribute(ClientIp.RAW_ATTRIBUTE, String.join(",", values));
          }
          chain.doFilter(req, res);
        };
    var registration = new FilterRegistrationBean<>(filter);
    registration.addUrlPatterns("/api/resume/otp/*");
    registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
    return registration;
  }
}
