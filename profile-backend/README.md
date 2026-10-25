# Profile backend

Java 25 and Spring Boot 4.0.8 API for the React portfolio. PostgreSQL owns accounts and published content. Redis caches public snapshots; PostgreSQL outbox rows drive notifications. The deployed site stays static until API routing is separately rehearsed.

## Run locally

1. Install Java 25, Docker, and Node 24. On macOS, use Homebrew OpenJDK and Colima.
2. Run `python3 scripts/setup-local.py` once, then `docker compose up -d`. Generated `.env` is ignored and mode 0600.
3. Set `JAVA_HOME` to JDK 25. Set `AUTH_ISSUER=https://<your-dev-Auth0-domain>/` and `AUTH_AUDIENCE=<your-dev-API-audience>` in the shell. They must match the Auth0 API used by React.
4. Start the API with `./scripts/dev.sh`.
5. In `../profile-ui`, run `npm run dev:backend`. This starts React in API mode and proxies `/api` to the Java service. Production container packaging builds the UI with `VITE_CONTENT_MODE=api` as well.

Vite proxies `/api` to port 8080. API mode displays a retry screen if the service is unavailable. Existing Firebase hosting remains the deployed release.

## Account and contact APIs

- Auth0 sign-in calls authenticated `POST /api/me` to create an application profile keyed by token issuer and subject. Repeating the call is safe. The app profile never trusts a client-supplied identity or admin flag.
- `GET /api/me` reads the signed-in user's own profile. `PUT /api/me` updates first/last name, phone, and optional mailing address (address lines, city, region, postal code, country). Verified email comes from Auth0 claims and is read-only in this profile editor. Responses use `Cache-Control: no-store`.
- The contact page in API mode sends `POST /api/contact`. PostgreSQL stores one inquiry and an outbox record in one transaction; an idempotency key prevents duplicate retries. Admins can review messages in `/admin/inquiries`.
- Flyway V8 adds optional profile contact/address columns without rewriting existing accounts. Apply schema updates through Flyway; don't edit applied migrations.

The production React container uses API mode so contact submissions reach PostgreSQL when served with this backend. The existing Firebase Hosting deployment is still separate and is not yet routed to the Spring API; do not enable API mode on that Firebase release until an API route is deployed and verified.

## Tests

Run `./mvnw verify` for unit and PostgreSQL Testcontainers tests. With Colima on macOS, use `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock` and `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` if needed. Tests use disposable databases; local data stays in the named `pgdata` volume.

In `../profile-ui`, run `npm run lint`, `npm run test:run`, and `npm run build`. The current `format:check` reports pre-existing formatting drift in multiple files. Avoid mass reformatting without reviewing that diff.

## Owner access

Sign in at `/account` once, then run `scripts/bootstrap-owner.sh '<issuer>' '<subject>'`. Configure Auth0 MFA for the owner first. The server checks the database owner role and an `amr` MFA claim on each admin request. No public role promotion route exists.

## Services

- PostgreSQL: `127.0.0.1:55432`, named persistent volume; runtime and migration identities differ.
- Redis: `127.0.0.1:56379`, disposable cache with PostgreSQL fallback.
- API: `127.0.0.1:8080`.
- Private files and captured email: ignored `.local/media/`.
- Source seed: `src/main/resources/seed/portfolio.json`; exporter: `../profile-ui/scripts/export-portfolio.mjs`.

Use synthetic test inquiries. Never place a real résumé in public assets; local private résumé goes in `.local/media/private/resume.pdf`.

## Environments

Activate exactly one profile: `dev`, `test`, or `prod`. Dev uses local Compose and email capture. Tests use a disposable database and fake local files. Production reads env vars or mounted secret files, requires verified database TLS and MFA, and runs Flyway with `baseline-on-migrate` at baseline version 8 (a DB bootstrapped from `scripts/supabase_init.sql` only gets V9+). Hybrid prod flags (all default off in prod): `PUBLISHING_ENABLED`, `NOTIFICATIONS_ENABLED`, `CACHE_ENABLED`, `CONTACT_ENABLED`; contact is handled by Web3Forms in the UI. Set `INQUIRY_IP_SALT` when enabling contact.

`Dockerfile` is the Cloud Run image (JRE only, no renderer). See `infra/cloud-run/README.md` for deploy steps and `infra/auth0/post-login-action.js` for the MFA claim. No DNS or cloud service has been changed.
