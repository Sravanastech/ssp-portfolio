package com.sravanaparimi.profile.resumeaccess;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.*;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.filter.OncePerRequestFilter;

/** Caps OTP request bodies: declared length is rejected up front, streamed bytes are bounded. */
@Configuration
class OtpBodyLimitFilter {
  static final int MAX_BODY_BYTES = 2048;
  private static final String PROBLEM =
      "{\"type\":\"about:blank\",\"title\":\"Bad Request\",\"status\":400,"
          + "\"detail\":\"Check the submitted fields\",\"code\":\"invalid_request\"}";

  @Bean
  FilterRegistrationBean<OncePerRequestFilter> otpBodyLimit() {
    var registration =
        new FilterRegistrationBean<OncePerRequestFilter>(
            new OncePerRequestFilter() {
              @Override
              protected void doFilterInternal(
                  HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                  throws ServletException, IOException {
                if (request.getContentLengthLong() > MAX_BODY_BYTES) {
                  response.setStatus(400);
                  response.setHeader("Cache-Control", "no-store");
                  response.setContentType("application/problem+json");
                  response.getOutputStream().write(PROBLEM.getBytes(StandardCharsets.UTF_8));
                  return;
                }
                chain.doFilter(new Limited(request), response);
              }
            });
    registration.addUrlPatterns("/api/resume/otp/*");
    // After the client IP capture (HIGHEST_PRECEDENCE) and ForwardedHeaderFilter (+1).
    registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 2);
    return registration;
  }

  private static final class Limited extends HttpServletRequestWrapper {
    private ServletInputStream stream;

    Limited(HttpServletRequest request) {
      super(request);
    }

    @Override
    public ServletInputStream getInputStream() throws IOException {
      if (stream == null) stream = new LimitedStream(super.getInputStream());
      return stream;
    }

    @Override
    public BufferedReader getReader() throws IOException {
      String encoding = getCharacterEncoding();
      Charset charset = encoding == null ? StandardCharsets.UTF_8 : Charset.forName(encoding);
      return new BufferedReader(new InputStreamReader(getInputStream(), charset));
    }
  }

  private static final class LimitedStream extends ServletInputStream {
    private final ServletInputStream in;
    private int count;

    LimitedStream(ServletInputStream in) {
      this.in = in;
    }

    private void account(int n) throws IOException {
      if (n > 0 && (count += n) > MAX_BODY_BYTES) throw new IOException("Request body too large");
    }

    @Override
    public int read() throws IOException {
      int b = in.read();
      if (b >= 0) account(1);
      return b;
    }

    @Override
    public int read(byte[] buf, int off, int len) throws IOException {
      int n = in.read(buf, off, len);
      account(n);
      return n;
    }

    @Override
    public boolean isFinished() {
      return in.isFinished();
    }

    @Override
    public boolean isReady() {
      return in.isReady();
    }

    @Override
    public void setReadListener(ReadListener listener) {
      in.setReadListener(listener);
    }
  }
}
