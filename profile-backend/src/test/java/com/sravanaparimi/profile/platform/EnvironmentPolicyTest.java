package com.sravanaparimi.profile.platform;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;
class EnvironmentPolicyTest {
 @Test void noProfileCannotSilentlyEnableDevelopment(){assertThrows(IllegalStateException.class,()->EnvironmentPolicy.validate(Set.of(),new MockEnvironment()));}
 @Test void combinedEnvironmentsCannotShareData(){assertThrows(IllegalStateException.class,()->EnvironmentPolicy.validate(Set.of("dev","prod"),new MockEnvironment()));}
 @Test void productionMustProvideRealSettings(){assertThrows(IllegalStateException.class,()->EnvironmentPolicy.validate(Set.of("prod"),new MockEnvironment()));}
 @Test void testsCannotUseRemoteDatabase(){assertThrows(IllegalStateException.class,()->EnvironmentPolicy.validate(Set.of("test"),new MockEnvironment().withProperty("spring.datasource.url","jdbc:postgresql://production.example.com/profile")));}
 @Test void developmentIsExplicit(){assertDoesNotThrow(()->EnvironmentPolicy.validate(Set.of("dev"),new MockEnvironment()));}
}
