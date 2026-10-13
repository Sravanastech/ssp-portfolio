package com.sravanaparimi.profile.platform;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
@Configuration public class SecurityConfiguration {
 @Bean JwtDecoder jwtDecoder(Environment env){
  String issuer=env.getRequiredProperty("profile.auth.issuer");
  var decoder=NimbusJwtDecoder.withJwkSetUri(env.getProperty("profile.auth.jwks",issuer+".well-known/jwks.json")).jwsAlgorithm(SignatureAlgorithm.RS256).build();
  decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer),token->{
   boolean valid=token.getAudience().contains(env.getRequiredProperty("profile.auth.audience")) && token.getSubject()!=null && !token.getSubject().isBlank() && token.getExpiresAt()!=null && token.getIssuedAt()!=null;
   return valid?OAuth2TokenValidatorResult.success():OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
  }));return decoder;
 }
 @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
  return http.csrf(csrf->csrf.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
   .authorizeHttpRequests(a->a.requestMatchers("/api/health","/api/site","/api/contact","/api/media/public/**").permitAll().requestMatchers("/api/**").authenticated().anyRequest().denyAll())
   .oauth2ResourceServer(o->o.jwt(j->{})).build();
 }
}
