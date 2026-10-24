# Resume access

The resume PDF is never part of the static build. `GET /api/resume` is served by the Java backend (`profile-backend`, `ResumeController`) and requires a valid Auth0 access token. Any authenticated user can view it; this is the intended login gate.

## Local development

1. Put the PDF at `private/Sravana_Parimi.pdf` (gitignored). `profile-backend/scripts/dev.sh` copies it into the backend's local media root.
2. Set `VITE_API_URL=http://127.0.0.1:8080` and the `VITE_AUTH0_*` values in `.env.local` (see `.env.example`).
3. Run `profile-backend/scripts/dev.sh`, then `npm run dev`. Vite proxies `/api` to `VITE_API_URL`.

`VITE_AUTH0_AUDIENCE` must match the backend's Auth0 audience. Use a custom Auth0 API with RS256 signing; a Management API audience or an ID token is not suitable.

## Production

Firebase Hosting rewrites `/api/**` to the Cloud Run service `profile-backend`. The PDF lives in a private GCS bucket mounted read-only into the container; see `profile-backend/infra/cloud-run/README.md`. Never serve the repository root or `private/` directory.

The browser fetches the PDF with an access token, creates a temporary object URL, and revokes it when leaving the page. Tokens are kept in memory, never in URLs or storage. Responses are `no-store` and the service worker treats `/api/resume` as network-only.
