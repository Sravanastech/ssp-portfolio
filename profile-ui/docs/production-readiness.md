# Production readiness

## Architecture

Static, prerendered React site on Firebase Hosting (project `ssp-profile`). Public content and the contact form (Web3Forms) are bundled; no API is needed to render any public page.

Firebase rewrites `/api/**` to the Cloud Run service `profile-backend` (`us-central1`), which serves only the gated `/api/resume`, `/api/me`, admin endpoints and `/api/health`. Only client-rendered routes (`/resume`, `/account`, `/admin/**`, `/auth-callback`) fall back to `index.html`; unknown paths return the prerendered `404.html`.

The resume PDF is never part of the static build. It lives in a private GCS bucket mounted read-only into Cloud Run (see `docs/secure-resume.md` and `profile-backend/infra/cloud-run/README.md`).

## Release gates

- `npm run verify`: Prettier, ESLint, Vitest, production build with prerender.
- `npx playwright test`: browser end-to-end suite.
- `npm run build:release`: refuses to build when the Auth0 callback points at localhost.
- CI: `.github/workflows/profile-ui.yml` (verify, audit, e2e), `quality.yml` (Lighthouse budgets on PRs), `site-health.yml` (weekly live checks), `deploy.yml` (manual hosting deploy).

## Before go-live

1. GitHub secrets: `FIREBASE_SERVICE_ACCOUNT`, `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_CALLBACK_URL`, `VITE_AUTH0_AUDIENCE`, `VITE_WEB3FORMS_ACCESS_KEY`, `VITE_GA_MEASUREMENT_ID`; optional `VITE_GOOGLE_SITE_VERIFICATION`, `VITE_BING_SITE_VERIFICATION`, `INDEXNOW_KEY`.
2. Auth0: refresh token rotation on; production callback, logout and web-origin URLs for `https://sravanasparimi.com`.
3. Backend deployed per `profile-backend/infra/cloud-run/README.md`.
4. After deploy: `/nope` returns 404, `/llms.txt` returns text, the CSP header is present, and signing in on `/resume` loads the PDF.
