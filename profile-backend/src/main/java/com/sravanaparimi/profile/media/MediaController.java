package com.sravanaparimi.profile.media;

import com.sravanaparimi.profile.accounts.AdminAuthorization;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.env.Environment;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;

@RestController
public class MediaController {
  public record MediaReceipt(UUID id, String url, String altText) {}
  private final AdminAuthorization admin;
  private final JdbcTemplate db;
  private final Path root;
  public MediaController(AdminAuthorization admin, JdbcTemplate db, Environment env) {
    this.admin=admin;this.db=db;this.root=Path.of(env.getProperty("profile.media.root",".local/media")).toAbsolutePath().normalize().resolve("public");
  }
  @PostMapping(value="/api/admin/media",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<MediaReceipt> upload(@AuthenticationPrincipal Jwt jwt,@RequestPart("file") MultipartFile file,@RequestParam(defaultValue="") String altText) throws Exception {
    UUID actor=admin.require(jwt); if(file.isEmpty()||file.getSize()>2_000_000||altText.length()>500)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Image size or description is invalid");
    byte[] bytes=file.getBytes();String type;String suffix;
    if(bytes.length>8&&Arrays.equals(Arrays.copyOf(bytes,8),new byte[]{(byte)137,80,78,71,13,10,26,10})){type="image/png";suffix="png";}
    else if(bytes.length>3&&(bytes[0]&255)==255&&(bytes[1]&255)==216&&(bytes[2]&255)==255){type="image/jpeg";suffix="jpg";}
    else throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Only PNG and JPEG images are supported");
    if(ImageIO.read(new ByteArrayInputStream(bytes))==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Image could not be decoded");
    UUID id=UUID.randomUUID();String name=id+"."+suffix;Files.createDirectories(root);Path target=root.resolve(name).normalize();if(!target.getParent().equals(root))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    Files.write(target,bytes,StandardOpenOption.CREATE_NEW);
    String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    try{db.update("INSERT INTO media(id,filename,content_type,alt_text,private,size_bytes,sha256) VALUES (?,?,?,?,false,?,?)",id,name,type,altText,bytes.length,hash);db.update("INSERT INTO audit_events(actor,action,resource) VALUES (?,?,?)",actor,"media.upload",id.toString());}
    catch(Exception ex){Files.deleteIfExists(target);throw ex;}
    return ResponseEntity.status(HttpStatus.CREATED).body(new MediaReceipt(id,"/api/media/public/"+name,altText));
  }
  @GetMapping("/api/media/public/{file}")
  public ResponseEntity<byte[]> get(@PathVariable String file) throws Exception {
    if(!file.matches("[0-9a-f-]{36}\\.(png|jpg)"))throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    var rows=db.query("SELECT content_type FROM media WHERE filename=? AND private=false",(r,n)->r.getString(1),file);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    Path path=root.resolve(file).normalize();if(!path.getParent().equals(root)||!Files.isRegularFile(path))throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    return ResponseEntity.ok().contentType(MediaType.parseMediaType(rows.getFirst())).cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePublic().immutable()).body(Files.readAllBytes(path));
  }
}
