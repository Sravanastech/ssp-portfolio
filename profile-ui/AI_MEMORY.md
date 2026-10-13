# Profile backend handoff

Last verified: 2026-10-07. This memory is project context, not a secret store.

## Goal and boundaries

Build the owner's personal portfolio as a modest-cost, full-stack application with enterprise-quality security and operational learning. `profile-ui` is React/TypeScript. `profile-backend` is the new Java 25 / Spring Boot 4 service. Preserve the pre-existing sibling `profile-services`; it is out of scope. Do not deploy or publish without a separately approved release request. Never place credentials, tokens, private inquiries, or private profile details in this file.

## Architecture

- PostgreSQL 17 + Flyway: accounts, content revisions, publication jobs, inquiries, audit/outbox state.
- Redis 8: optional content cache; application falls back to PostgreSQL.
- Auth0 bearer JWTs: backend validates issuer/audience/signature. Admin owner access is server controlled and MFA-gated.
- React API routes: `/account`, `/admin`, `/admin/inquiries`; backend also provides public content, contact, media, and protected resume operations.
- Auth0 login now idempotently provisions the user's application row with `POST /api/me`. `GET /api/me` is read-only; `PUT /api/me` updates first/last name, phone, and optional postal address. Auth0 verified email is read-only; admin and token identity fields cannot be edited by users. Flyway V8 adds the optional contact/address columns.
- In API mode the contact page posts to `/api/contact`; the existing `inquiries` and `outbox` tables persist each accepted submission transactionally and safely deduplicate retries. The production backend image builds React in API mode. Firebase Hosting is still not routed to the Spring service, so don't switch the Firebase release to API mode until the API endpoint is deployed and routing is tested.
- Backend code lives in `profile-backend/src/main/java`; SQL migrations in `src/main/resources/db/migration`; React API helpers/pages live in `profile-ui/src/api` and `src/pages`.
- Local services: `cd profile-backend && python3 scripts/setup-local.py && docker compose up -d`; start API with `JAVA_HOME=/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home PATH=/opt/homebrew/opt/openjdk@25/bin:$PATH sh scripts/dev.sh`. Start UI with `cd profile-ui && npm run dev:backend`.

## Verification evidence

- Backend: same `./mvnw -B verify` command — passed 25 tests after V8 account profile migration on 2026-10-07.
- Runtime: local `GET /api/health` returned `{"status":"UP"}`; `GET /api/site` returned seeded revision 1.
- UI: `npm run test:run` (caps Vitest at 2 workers) — 179 passed; `VITE_CONTENT_MODE=api npm run build` — TypeScript, Vite, and six-route prerender passed. `npm run lint` exited successfully with 8 Fast Refresh warnings and zero errors.
- Root CI template: `.github/workflows/profile-backend.yml`. It has not yet run on GitHub.
- Word teaching guide: `docs/full-stack-learning-guide.docx`, source `docs/full-stack-learning-guide.md`.

2026-10-07 account/contact update: Auth0 session POST now provisions an app profile; GET is read-only; PUT updates first/last name, phone, and optional address. Flyway V8 is additive and was applied to local PostgreSQL; `/api/health` is UP. Contact API-mode UI POST persists to existing inquiry/outbox tables with idempotency. Full integration tests verify it. Existing Firebase Hosting is still not routed to Spring, so public Firebase submissions will not use PostgreSQL until API deployment/routing is configured and verified.

## Remaining release gates

Production is NOT ready or deployed. Configure and verify real Auth0 tenant, MFA and admin mapping; email sender/recipient; public domain/TLS and routing; private secret management; rate limiting and abuse handling; durable off-host encrypted backups plus restore exercise; publish rollback; image vulnerability scanning/SBOM; CI on GitHub; monitoring/alerts; and measured hosting/monthly cost. Vault is intended as a local learning lab, not a production secret backend. Do not claim high availability from one-server Compose.

## Changes and decisions

Java/Spring Boot is primary backend; Python is reserved for later AI experiments. Use `profile-backend`, never rename or overwrite `profile-services`. Website client and project disclosures must remain generalized and permission-safe. For full context on portfolio content accuracy and disclosures, read `docs/content-accuracy-audit.md`.

2026-10-07: Backend/UI integration baseline built locally. Latest run: 24 backend tests and 176 frontend tests passed; frontend build passed; local API health and seeded public content verified. See `docs/full-stack-learning-guide.md` and sibling `profile-backend/README.md` for walkthrough. Production remains unlaunched with release gates above.
