import { readFile } from "node:fs/promises";
import { createRemoteJWKSet, jwtVerify } from "jose";

const defaultResumePath = new URL(
  "../private/Sravana_Parimi.pdf",
  import.meta.url,
);

export function createResumeHandler({
  domain = process.env.AUTH0_DOMAIN,
  audience = process.env.AUTH0_AUDIENCE,
  resumePath = process.env.RESUME_PATH || defaultResumePath,
  keySet,
} = {}) {
  const issuer = domain
    ? `https://${domain.replace(/^https:\/\//, "").replace(/\/$/, "")}/`
    : null;
  const keys =
    keySet ||
    (issuer
      ? createRemoteJWKSet(new URL(".well-known/jwks.json", issuer))
      : null);
  return async function resumeHandler(request, response) {
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Vary", "Authorization");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Robots-Tag", "noindex, noarchive");
    const fail = (status, message) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: message }));
    };
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      return fail(405, "Method not allowed");
    }
    if (!issuer || !audience || !keys)
      return fail(503, "Resume access is temporarily unavailable.");
    const authorization = request.headers.authorization;
    if (
      typeof authorization !== "string" ||
      !/^Bearer \S+$/.test(authorization)
    ) {
      response.setHeader("WWW-Authenticate", "Bearer");
      return fail(401, "Sign in to access the resume.");
    }
    try {
      await jwtVerify(authorization.slice(7), keys, {
        issuer,
        audience,
        algorithms: ["RS256"],
        requiredClaims: ["sub", "iat", "exp"],
      });
    } catch {
      response.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"');
      return fail(
        401,
        "Your session could not be verified. Please sign in again.",
      );
    }
    try {
      const pdf = await readFile(resumePath);
      response.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="Sravana_Parimi_Resume.pdf"',
        "Content-Length": pdf.length,
      });
      response.end(pdf);
    } catch {
      return fail(
        503,
        "The resume is temporarily unavailable. Please try again later.",
      );
    }
  };
}
