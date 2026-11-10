package com.sravanaparimi.profile.resumeaccess;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationProvider;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

/**
 * Dedicated chains for the resume area. The main chain stays Auth0-only, so an OTP token can never
 * authenticate against /api/me, admin endpoints or any other path.
 */
@Configuration
public class ResumeSecurityConfiguration {
  private static PathPatternRequestMatcher path(HttpMethod method, String pattern) {
    return PathPatternRequestMatcher.withDefaults().matcher(method, pattern);
  }

  /** OTP request/verify: public (CAPTCHA and limits apply); bearer headers are ignored. */
  @Bean
  @Order(1)
  SecurityFilterChain otpChain(HttpSecurity http) throws Exception {
    return http.securityMatcher(path(null, "/api/resume/otp/**"))
        .csrf(csrf -> csrf.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        path(HttpMethod.POST, "/api/resume/otp/request"),
                        path(HttpMethod.POST, "/api/resume/otp/verify"))
                    .permitAll()
                    .anyRequest()
                    .denyAll())
        .build();
  }

  /** GET /api/resume accepts an Auth0 JWT or an OTP token, chosen by the (unverified) issuer. */
  @Bean
  @Order(2)
  SecurityFilterChain resumeChain(
      HttpSecurity http, JwtDecoder auth0Decoder, ResumeTokenService tokens) throws Exception {
    AuthenticationManager auth0 = manager(auth0Decoder);
    AuthenticationManager otp = manager(tokens.decoder());
    var bearer = new DefaultBearerTokenResolver();
    return http.securityMatcher(path(null, "/api/resume/**"))
        .csrf(csrf -> csrf.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers(path(HttpMethod.GET, "/api/resume"))
                    .authenticated()
                    .anyRequest()
                    .denyAll())
        .oauth2ResourceServer(
            o ->
                o.authenticationManagerResolver(
                    request -> {
                      String token = bearer.resolve(request);
                      return token != null && ResumeTokenService.isOtpIssuer(token) ? otp : auth0;
                    }))
        .build();
  }

  private static AuthenticationManager manager(JwtDecoder decoder) {
    return new ProviderManager(new JwtAuthenticationProvider(decoder));
  }
}
