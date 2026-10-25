package com.sravanaparimi.profile;

import com.sravanaparimi.profile.platform.EnvironmentPolicy;
import java.util.Set;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ProfileApplication {
  public static void main(String[] args) {
    SpringApplication app = new SpringApplication(ProfileApplication.class);
    app.addInitializers(
        ctx ->
            EnvironmentPolicy.validate(
                Set.of(ctx.getEnvironment().getActiveProfiles()), ctx.getEnvironment()));
    app.run(args);
  }
}
