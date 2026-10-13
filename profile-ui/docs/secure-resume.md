# Resume API deployment

The resume lives in `private/Sravana_Parimi.pdf`. It is deliberately outside Vite's `public/` directory and is not included in the static build. `GET /api/resume` verifies a signed Auth0 access token before reading it. Any authenticated user with a valid token for this API can view the resume; this is the same access policy as the existing login gate.

## Local development

Use Node 22 or newer. In your ignored `.env.local`, configure these server values in addition to the existing `VITE_AUTH0_*` settings:

```dotenv
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://your-portfolio-api
# Optional absolute path for a separately mounted private PDF:
# RESUME_PATH=/run/secrets/Sravana_Parimi.pdf
```

`AUTH0_DOMAIN` and `AUTH0_AUDIENCE` must match `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_AUDIENCE`. In Auth0, use a custom API with the audience identifier above and RS256 signing. A Management API audience or an ID token is not suitable. Allow the localhost callback and origin in the existing Auth0 SPA application.

Run `npm run dev:api` in one terminal and `npm run dev` in another. Vite proxies `/api` to port 8787. Missing server configuration fails closed with HTTP 503; no fallback exposes the PDF.

## Production

Deploy `server/`, production dependencies, and the private PDF to a Node host. Start the API with the server environment above, using `API_HOST=0.0.0.0` if the hosting platform requires it. Route `/api/*` from the public site's HTTPS origin to this API before your static SPA fallback. The API needs outbound HTTPS access to the Auth0 tenant's JWKS endpoint. Serve only `dist/` as public static content; never serve the repository root or `private/` directory.

If the previous public PDF was deployed, remove that static object from the deployed artifact and purge CDN caches for `/Sravana_Parimi.pdf`. Moving it locally cannot recall a previously downloaded or cached copy, or remove it from repository history. The old URL must return a 404 or the normal site page, never PDF bytes. Do not cache `/api/resume`; responses already specify `private, no-store` and `Vary: Authorization`.

The browser fetches the PDF with an access token, creates a temporary object URL, and revokes it when leaving the page. No access token is included in URLs or persisted by this feature. The API verifies signature, issuer, audience, expiry, subject, and issue-time claims, and only allows RS256. Run `npx vitest run server/resume.test.mjs` to verify access rejection and authorized file delivery using locally generated signing keys.
