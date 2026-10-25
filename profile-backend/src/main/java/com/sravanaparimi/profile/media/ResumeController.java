package com.sravanaparimi.profile.media;

import java.nio.file.*;
import org.springframework.core.env.Environment;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
public class ResumeController {
  private final Path path;

  public ResumeController(Environment env) {
    path =
        Path.of(env.getRequiredProperty("profile.media.root"))
            .toAbsolutePath()
            .resolve("private/resume.pdf");
  }

  @GetMapping("/api/resume")
  public ResponseEntity<Resource> resume() {
    var builder =
        ResponseEntity.status(Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS) ? 200 : 503)
            .cacheControl(CacheControl.noStore())
            .header("X-Robots-Tag", "noindex, nofollow, noarchive")
            .header("X-Content-Type-Options", "nosniff")
            .header("Content-Disposition", "inline; filename=resume.pdf");
    return Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)
        ? builder.contentType(MediaType.APPLICATION_PDF).body(new FileSystemResource(path))
        : builder.build();
  }
}
