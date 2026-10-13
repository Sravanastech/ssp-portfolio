# Learning path

This portfolio uses enterprise habits at a small scale: explicit environments, server-side identity, PostgreSQL transactions, recoverable work, and rehearsed releases. Follow these stages in order. Run each command, inspect the result, and explain why the change exists.

## Stage 1: Local environment

Run `docker compose up -d`. Compose YAML defines service ports, a named data volume, health checks, and local-only network exposure. The random secrets in `.env` belong to this development database only. Use `docker compose config`, `ps`, `logs`, and `exec` to inspect it. `docker compose down` keeps the named volume.

## Stage 2: Schema and seed

Read `src/main/resources/db/migration/V1__content.sql`. Flyway applies ordered SQL and records each migration. PostgreSQL stores a versioned public snapshot. Compare `src/main/resources/seed/portfolio.json` with React source using `../profile-ui/scripts/export-portfolio.mjs`; the exporter prints a SHA-256 hash. Add a new migration instead of editing one already applied in production.

## Stage 3: Java API

Run `./scripts/dev.sh`. Read `/api/health` and `/api/site`, their service, and repository SQL. The API uses JDBC and explicit DTOs. Request `/api/site` twice with its ETag; the second response is 304. `application-dev.yml` selects local configuration. Startup rejects missing or mixed environment profiles.

## Stage 4: Visitor accounts

Sign in through the existing Auth0 React provider. The backend validates signature, RS256, issuer, audience, expiry, issued-at, and subject. `/api/me` uses the signed issuer and subject; the browser cannot choose identity. Try GET, PATCH, and DELETE `/api/me`. Deletion clears portfolio profile data without claiming to remove the Auth0 identity. Tests cover invalid tokens and cross-account isolation.

## Stage 5: Owner editing

Open `/account`, then `/admin` after owner bootstrap. The JSON draft covers profile, experiences, projects, case studies, expertise, page copy, SEO, and navigation. Edit a small field, save, reload, then publish. A stale version returns 409. Public reads select only the active published revision. Each admin request checks the server-side owner row and token MFA claim.

## Stage 6: Inquiries and events

Set `VITE_CONTENT_MODE=api` for local React. Submit synthetic contact messages and inspect `/admin/inquiries`. The API validates lengths and reply address, applies a honeypot and rate limit, and stores the inquiry and outbox row in one transaction. Reusing an idempotency key returns the original receipt. The worker claims rows with PostgreSQL locks and leases. Local email capture stays under ignored `.local/media/capture`.

## Stage 7: Private files and public media

Put a synthetic PDF in `.local/media/private/resume.pdf`. Request `/api/resume` without a token and with a valid token. It returns no-store headers and fails closed if the file is missing. Admin image upload validates size and decoded bytes, accepts PNG/JPEG, and chooses its own storage name. Try a script-bearing SVG and path traversal; both must fail.

## Stage 8: Redis and scheduling

Redis caches only published public snapshots. Its active pointer lasts one minute and snapshot five minutes; failures fall back to PostgreSQL. Test configuration points Redis to a closed local port. Repeat a public read. Scheduled jobs use UTC instants and unique database keys, so duplicate workers cannot commit the same scheduled effect twice. External effects go through the outbox.

## Stage 9: Publication

Build the React renderer with `npm run build:content-renderer`. Publishing creates a durable job. The worker renders six routes to a staging directory, checks completeness, and activates the matching database revision. Renderer failure keeps the old revision active. Existing Firebase hosting still serves its current release; a live hosting adapter needs a separate release review.

## Stage 10: HashiCorp Vault lab

The Vault lab is localhost-only and uses synthetic values. Start `docker-compose --profile vault-lab up -d vault`, then follow `docs/runbooks/vault-lab.md`. Learn KV v2 policy boundaries, token TTL/renewal/revocation, and denied access. Database dynamic credentials are an exercise against a disposable DB only. The known lab token is never a development or production credential. Production currently reads mounted secret files.

## Stage 11: Release configuration

Read `Dockerfile`, `compose.prod.yaml`, and `.github/workflows/ci.yml`. The production template uses mounted secrets, a non-root user, a read-only root filesystem, resource limits, and an external database. The running application disables Flyway; release operators use a separate migration identity. CI runs backend and frontend checks. No deployment or DNS change is included.

## Stage 12: Backup and recovery

Use `docs/runbooks/backup-restore.md` with synthetic data and an age public key. Decrypt into a fresh database, compare row counts, and check private file permissions. Record restore time. Keep the encrypted copy off the development host. The runbook is not evidence of a production recovery exercise.

## Teaching routine

For each stage, explain the idea, identify changed files, run the check, break one safe dependency, observe recovery, and update `AI_MEMORY.md`. Production readiness still needs live Auth0 MFA, email delivery, API routing, TLS, image scanning, restore, and rollback evidence.
