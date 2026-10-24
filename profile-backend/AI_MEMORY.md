# profile-backend project memory

This is a model-neutral handoff. Updated 2026-10-07. Never store passwords, tokens, secret values, private inquiries, or account records here.

## Purpose and constraints

Java/Spring Boot backend for a personal portfolio, with enterprise-quality learning and controls at personal scale. The React app remains in sibling `profile-ui`. Keep the pre-existing `profile-services` sibling untouched. No production deploy has been requested or executed. Preserve existing user files and Git state; never reset, clean, or stage unrelated files.

## Stack and major areas

- Java 25, Spring Boot 4.0.8, Maven wrapper.
- PostgreSQL 17 / Flyway for durable content, account, inquiry, audit, and background work.
- Redis 8 for optional public content caching with database fallback.
- Auth0 resource-server JWT validation; admin actions require server-side owner authorization and MFA assurance.
- Durable outbox and publication job tables; scheduled workers use leases and idempotent acknowledgements.
- Modules under `src/main/java/com/sravanaparimi/profile`: accounts, content, inquiries, jobs, media, platform, publishing.
- Migrations under `src/main/resources/db/migration`. Profiles: `dev`, `test`, `prod`.
- `accounts` rows are provisioned by authenticated idempotent `POST /api/me` using token issuer+subject; `GET /api/me` is read-only; `PUT /api/me` updates first/last name, phone, and optional address fields. V8 adds the optional profile fields. Verified Auth0 email is read-only; admin status and identity claims are server-owned.
- Contact API mode posts `POST /api/contact`; V5 already stores inquiry and outbox records in the same PostgreSQL transaction. Contact retry idempotency is required. Backend container packaging must use `VITE_CONTENT_MODE=api`.
- Local Compose: PostgreSQL on localhost:55432, Redis on localhost:56379. Secrets stay in ignored local `.env` or production secret files; do not inspect/print those values.

## Local workflow

```sh
cd profile-backend
python3 scripts/setup-local.py
docker compose up -d
JAVA_HOME=/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home PATH=/opt/homebrew/opt/openjdk@25/bin:$PATH sh scripts/dev.sh
```

In another terminal, run the React project with `npm run dev:backend`. Set up the Auth0 issuer, API audience and redirect URI locally before testing sign-in; do not use a fake public token.

## Verified on 2026-10-07

- `TESTCONTAINERS_RYUK_DISABLED=true DOCKER_HOST=unix:///Users/ramasrinivas/.colima/default/docker.sock JAVA_HOME=/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home ./mvnw -B verify`: BUILD SUCCESS, 25 integration tests after V8.
- Running local API: `/api/health` returned UP and `/api/site` returned active seeded revision 1.
- UI sibling: 179 tests passed with `--maxWorkers=2`; TypeScript/Vite API-mode build and static prerender passed. Lint exited successfully with 8 existing Fast Refresh warnings, zero errors.
- Root CI workflow: `../.github/workflows/profile-backend.yml`; not yet observed running on GitHub.

## Release blockers

Architecture is "hybrid" (decided 2026-10): site content and the contact form are static in `profile-ui` (Web3Forms). Cloud Run `profile-backend` (project `ssp-profile`, us-central1, behind Firebase Hosting `/api/**` rewrite) serves only gated `/api/resume` (any authenticated Auth0 user), `/api/me`, admin endpoints, `/api/health`. Prod profile defaults publishing, notification worker, Redis cache and contact API OFF via `PUBLISHING_ENABLED`, `NOTIFICATIONS_ENABLED`, `CACHE_ENABLED`, `CONTACT_ENABLED` (publish endpoint returns 503, contact returns 503). Flyway is enabled in prod with baseline-on-migrate at version 8; `scripts/supabase_init.sql` is bootstrap-only (= V1-V8). Resume comes from a GCS bucket mounted read-only at `/var/lib/profile/media`. Deploy steps: `infra/cloud-run/README.md`. MFA claim: `infra/auth0/post-login-action.js` (backend accepts `amr` or `https://sravanasparimi.com/amr`). `compose.prod.yaml` and `ScheduledJobCoordinator` were removed (V7 `job_runs` table kept; migrations are immutable).

Still open: user must run the deploy (bucket, resume upload, secrets, `gcloud run deploy`), create/deploy the Auth0 Action and enroll MFA, set the admin row (`accounts.is_admin`), verify through Firebase Hosting, then add monitoring/alerts, DB backups plus restore exercise, image scanning/SBOM in CI, cost measurement, and runbooks. If the contact API is ever enabled in prod: verified email sender, `INQUIRY_IP_SALT` secret, `EMAIL_MODE=provider` (startup policy enforces this). Vault in `compose.yaml` is a pinned learning lab only.

For project context, build steps, architecture explanation, and content-disclosure rules, see `../profile-ui/AI_MEMORY.md` and `../profile-ui/docs/full-stack-learning-guide.docx`.
