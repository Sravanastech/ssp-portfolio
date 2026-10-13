package com.sravanaparimi.profile.inquiries;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
@RestController public class ContactController {
 private final InquiryService service;public ContactController(InquiryService service){this.service=service;}
 @PostMapping("/api/contact") public ResponseEntity<InquiryService.Receipt> accept(@RequestHeader(value="Idempotency-Key",required=false) String key,@Valid @RequestBody InquiryService.Contact input,HttpServletRequest request){return ResponseEntity.accepted().cacheControl(CacheControl.noStore()).body(service.accept(key,input,request.getRemoteAddr()));}
}
