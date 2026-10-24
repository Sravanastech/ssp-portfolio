package com.sravanaparimi.profile.platform;
import java.util.Set;
import org.springframework.core.env.Environment;
public final class EnvironmentPolicy {
 public static void validate(Set<String> profiles, Environment env) {
  if(profiles.size()!=1 || !Set.of("dev","test","prod").containsAll(profiles)) throw new IllegalStateException("Select exactly one profile: dev, test, prod");
  if(profiles.contains("test")) {
   String db=env.getProperty("spring.datasource.url", "").split("\\?",2)[0];
   if(!db.matches("jdbc:postgresql://(localhost|127\\.0\\.0\\.1):[0-9]+/test_[a-zA-Z0-9_]+")) throw new IllegalStateException("Tests require an isolated localhost test_ database");
   if(!env.getProperty("profile.email.mode","capture").equals("capture")) throw new IllegalStateException("Tests prohibit external email");
  }
  if(profiles.contains("prod")) {
   for(String key:Set.of("spring.datasource.url","spring.datasource.username","spring.datasource.password","profile.auth.issuer","profile.auth.audience","profile.media.root")) {
    String value=env.getProperty(key,"");
    if(value.isBlank() || value.contains("example") || value.contains("CHANGEME") || value.contains("localhost")) throw new IllegalStateException("Production requires configured " +key);
   }
   boolean contact=env.getProperty("profile.contact.enabled",Boolean.class,true);
   if(contact && !"provider".equals(env.getProperty("profile.email.mode"))) throw new IllegalStateException("Production contact API requires profile.email.mode=provider");
   if(contact && !env.getProperty("profile.notifications.enabled",Boolean.class,true)) throw new IllegalStateException("Production contact API requires notifications enabled");
   if(contact && env.getProperty("profile.inquiries.ip-salt","").length()<16) throw new IllegalStateException("Production requires profile.inquiries.ip-salt of at least 16 characters");
   if("provider".equals(env.getProperty("profile.email.mode"))) {
    for(String key:Set.of("profile.email.endpoint","profile.email.key","profile.email.recipient","profile.email.from")) {
     String value=env.getProperty(key,"");
     if(value.isBlank() || value.contains("example") || value.contains("CHANGEME") || value.contains("localhost")) throw new IllegalStateException("Production requires configured " +key);
    }
   }
   if(!env.getProperty("profile.auth.issuer", "").startsWith("https://")) throw new IllegalStateException("Production identity must use HTTPS");
   if(!env.getProperty("spring.datasource.url", "").contains("sslmode=verify-full") && !env.getProperty("spring.datasource.url", "").contains("sslmode=require")) throw new IllegalStateException("Production database must verify TLS");
   if(!env.getProperty("profile.admin.require-mfa","true").equals("true")) throw new IllegalStateException("Production administration requires MFA");
  }
 }
}
