package com.sravanaparimi.profile;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.util.Set;
import com.sravanaparimi.profile.platform.EnvironmentPolicy;
@SpringBootApplication @EnableScheduling
public class ProfileApplication {
 public static void main(String[] args) {
  SpringApplication app=new SpringApplication(ProfileApplication.class);
  app.addInitializers(ctx->EnvironmentPolicy.validate(Set.of(ctx.getEnvironment().getActiveProfiles()),ctx.getEnvironment()));
  app.run(args);
 }
}
