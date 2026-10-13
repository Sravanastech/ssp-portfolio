package com.sravanaparimi.profile.publishing;
import org.springframework.stereotype.Component;
import org.springframework.core.env.Environment;
import java.nio.file.*;
import java.util.concurrent.TimeUnit;
@Component public class HtmlRenderer {
 private final Environment env;
 public HtmlRenderer(Environment env){this.env=env;}
 public Path release(long revision){return Path.of(env.getRequiredProperty("profile.media.root")).toAbsolutePath().resolve("releases").resolve(Long.toString(revision));}
 public void render(long revision,String snapshot) throws Exception {
  String script=env.getProperty("profile.renderer.script","");if(script.isBlank())throw new IllegalStateException("Renderer must be configured");
  Path target=release(revision);if(Files.isRegularFile(target.resolve("READY")))return;
  Files.createDirectories(target.getParent());Path staging=Files.createTempDirectory(target.getParent(),"render-");
  Path input=staging.resolve("snapshot.json");Files.writeString(input,snapshot);
  var builder=new ProcessBuilder(env.getProperty("profile.renderer.node","node"),Path.of(script).toAbsolutePath().toString(),input.toString(),staging.toString());
  String bundle=env.getProperty("profile.renderer.bundle");if(bundle!=null)builder.environment().put("PROFILE_RENDERER_BUNDLE",Path.of(bundle).toAbsolutePath().toString());
  String template=env.getProperty("profile.renderer.template");if(template!=null)builder.environment().put("PROFILE_STATIC_INDEX",Path.of(template).toAbsolutePath().toString());
  var process=builder.redirectOutput(ProcessBuilder.Redirect.DISCARD).redirectError(ProcessBuilder.Redirect.DISCARD).start();
  if(!process.waitFor(45,TimeUnit.SECONDS)){process.destroyForcibly();throw new IllegalStateException("Renderer timeout");}if(process.exitValue()!=0)throw new IllegalStateException("Renderer failed");
  for(String route:new String[]{"index.html","about/index.html","work/index.html","contact/index.html","privacy/index.html","termsconditions/index.html"})if(!Files.isRegularFile(staging.resolve(route)))throw new IllegalStateException("Incomplete release");
  Files.delete(input);Files.writeString(staging.resolve("READY"),Long.toString(revision));
  // Same filesystem, immutable directory, database pointer activated only after successful move.
  if(Files.exists(target)){try(var paths=Files.walk(target)){for(var p:paths.sorted(java.util.Comparator.reverseOrder()).toList())Files.delete(p);}}
  Files.move(staging,target,StandardCopyOption.ATOMIC_MOVE);
 }
}
