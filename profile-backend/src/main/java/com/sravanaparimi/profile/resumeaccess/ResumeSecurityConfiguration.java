package com.sravanaparimi.profile.resumeaccess;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

@Configuration
public class ResumeSecurityConfiguration {
  @Bean
  @Order(1)
  SecurityFilterChain resumeChain(HttpSecurity http) throws Exception {
    return http.securityMatcher(PathPatternRequestMatcher.pathPattern("/api/resume/otp/**"))
        .csrf(csrf -> csrf.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        PathPatternRequestMatcher.pathPattern(
                            HttpMethod.POST, "/api/resume/otp/request"),
                        PathPatternRequestMatcher.pathPattern(
                            HttpMethod.POST, "/api/resume/otp/verify"))
                    .permitAll()
                    .anyRequest()
                    .denyAll())
        .build();
  }
}
