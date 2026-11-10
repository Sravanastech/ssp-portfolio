package com.sravanaparimi.profile.resumeaccess;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Collections;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.filter.ForwardedHeaderFilter;

/**
 * Stashes the raw X-Forwarded-For value before ForwardedHeaderFilter (forward-headers-strategy:
 * framework) removes the header from the request.
 */
@Configuration
class ClientIpCaptureFilter {
  static final int CAPTURE_ORDER = Ordered.HIGHEST_PRECEDENCE;
  static final int FORWARDED_ORDER = Ordered.HIGHEST_PRECEDENCE + 1;

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
    registration.setOrder(CAPTURE_ORDER);
    return registration;
  }

  /**
   * Boot registers ForwardedHeaderFilter at HIGHEST_PRECEDENCE too, which would be an ordering tie.
   * Push it one step later so the capture filter strictly runs first.
   */
  @Bean
  static BeanPostProcessor forwardedHeaderFilterAfterCapture() {
    return new BeanPostProcessor() {
      @Override
      public Object postProcessAfterInitialization(Object bean, String name) {
        if (bean instanceof FilterRegistrationBean<?> registration
            && registration.getFilter() instanceof ForwardedHeaderFilter)
          registration.setOrder(FORWARDED_ORDER);
        return bean;
      }
    };
  }
}
