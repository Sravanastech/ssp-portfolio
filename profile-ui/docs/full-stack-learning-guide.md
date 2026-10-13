# Full stack portfolio development and deployment guide

Version 3 • October 7 2026 • Architecture, implementation baseline, and teaching workbook

Build this existing React portfolio into an application that you can operate, explain, and extend. You will learn how requests reach a backend, how data and permissions work, how background work survives failures, and how a tested release reaches production.

Java and Spring Boot are the confirmed primary backend, selected by the owner on October 5 2026. Keep React and TypeScript for the frontend. The implementation baseline uses PostgreSQL, Redis, database-backed outbox/publication jobs, and scheduled workers. Python is reserved for later AI experiments. Visitor accounts are confirmed; hosting, budget, and operational targets still require review.

Use enterprise engineering practices at a personal portfolio scale: server-enforced permissions, automated tests, controlled releases, secret handling, backups, and measured recovery. The low-cost deployment is a single server and cannot provide high availability during server or regional failure.

This workbook began as a plan and now documents a working local baseline in the sibling `profile-backend` project. The backend, API-connected React routes, local database setup, tests, and deployment templates exist. Production credentials, domain routing, cloud deployment, tested backups, recovery exercises, and production operations remain release work. Do not treat a green local build as a production launch.

## How to use this workbook

Work through one numbered chapter at a time. Explain the idea, build the smallest useful slice, run its checks, and then update AI_MEMORY.md at the repository root. Keep the working application demonstrable after every milestone.

The reading order is: verify the baseline; choose the architecture and budget; build locally; add accounts and editing; add caching and durable work; learn Vault; build deployment automation; rehearse recovery; launch; then explore enterprise growth.

Each lesson includes ordered work, completion evidence, and a teaching exercise. Learning time depends on your familiarity; allow roughly 80–140 focused hours across 8–12 weeks as a planning estimate, then replace that estimate after the first two milestones.

## Document navigation

- Chapters 1–4: evidence, product scope, architecture, and costs.
- Chapters 5–9: local setup, database, Java API, identity, and React editing.
- Chapters 10–14: publishing, Redis, events, schedulers, and Vault.
- Chapters 15–18: YAML, containers, delivery automation, and deployment.
- Chapters 19–22: production proof, teaching schedule, AI handoff, and references.

# 1 Verify the existing product

## Findings from this repository

| Area | Existing evidence | Work still required |
|---|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query, Zod | Preserve pages and add account and admin workflows |
| Content | src/data/profile.ts, workProjects.ts, caseStudies.ts, expertise.ts | Persist editable content and revisions |
| Login | Auth0 provider and protected résumé route | Add admin permissions and a complete account lifecycle |
| Backend | server/index.mjs handles résumé and telemetry | Implement content, accounts, inbox, and publishing APIs |
| Account | UserProfile form and UserApi client exist | Add route and persistence; local /api/user is missing |
| Contact | Browser submits to Web3Forms | Save inquiries and track notification delivery |
| Deployment | Firebase hosting workflow | Deploy API and route API requests before SPA fallback |
| SEO | Build-time HTML prerender | Refresh HTML after content publication |

The workflow provides VITE_API_URL, but UserApi reads VITE_API_BASE_URL. The deployment writes a service-account file but does not reference that file through GOOGLE_APPLICATION_CREDENTIALS; it also supplies FIREBASE_TOKEN. Choose one supported authentication path during the deployment milestone. No production credentials were inspected.

## Verification performed on October 4

The command npm run test:run passed 156 tests in 23 files. The command npm run build passed TypeScript compilation, Vite bundling, and prerendering of six public routes. These results cover the existing UI, not the planned Java backend. Browser tests, live login, live email delivery, cloud configuration, and restoration were not verified in this task.

## Content provenance

The previous content audit records owner-confirmed career dates: Kroger ends May 2026 and Fifth Third starts June 2026. Preserve this content while moving it into database records. Do not manufacture impact percentages, users served, certifications, or employer architecture. The audit is evidence of prior review, not independent employment verification. Keep conceptual diagrams labeled as conceptual.

Read docs/content-accuracy-audit.md and docs/production-readiness.md before changing facts. The earlier solutions-architecture-plan.md proposed a TypeScript Worker backend; this workbook revises that proposal to satisfy the confirmed Java and Spring Boot learning path.

# 2 Define the complete product

## Permissions and experiences

| Person | Allowed experience | Forbidden operation |
|---|---|---|
| Anonymous visitor | Browse published pages and send an inquiry | Read drafts, inbox, private accounts, or protected résumé |
| Visitor account | Register, verify email, recover access, edit own account, view résumé | Change website content or another account |
| Admin | Edit all content fields, preview, publish, reorder, archive, upload media, manage inbox | Read passwords or edit infrastructure credentials through CMS |

An account contains a display name, optional avatar, identity reference, and preferences. Preserve existing address/phone fields only if the owner confirms a use for them. Email changes, recovery, and password changes belong to the identity provider. Account deletion requires recent authentication and a documented retention workflow.

## Inventory the editable fields

1. Biography: name, title, employer, location, headline, descriptions, leadership text, email, and links.
2. Experiences: employer, role, start/end dates, current-role flag, responsibilities, and order.
3. Projects and case studies: title, summary, body sections, technologies, contribution, outcomes, evidence labels, images, and links.
4. Expertise and services: headings, descriptions, skill lists, and order.
5. Site content: navigation labels, footer, contact copy, legal copy, SEO title/description, and social image.
6. Media: public images, alternative text, attribution, private résumé file, and upload status.
7. Workflow: draft status, preview, publication history, archive/restore, and concurrent edit conflicts.

Trace each rendered field to a source file, database field, API response, editor control, and acceptance test. This prevents a visually complete admin page from leaving half the website hard-coded.

## Targets to review

Assume one admin, 1,000 monthly active visitors with accounts, 50,000 page views/month, under 1 GB of application data, and 2 GB of current media. Target 60-second public API freshness and five-minute crawler HTML publication. Proposed recovery objectives are at most 24 hours of data loss and restoration within four hours. These are proposed targets to test, not contractual guarantees.

Completion evidence: a permission matrix and field inventory reviewed by the owner. Exercise: explain why a logged-in visitor still receives HTTP 403 when calling an admin endpoint directly.

# 3 Build around Java and Spring Boot

## Record the backend decision

| Approach | Strength | Cost or complexity consequence |
|---|---|---|
| Java and Spring Boot | Strong fit with the portfolio and enterprise Java learning | Learn Maven, Spring Security, SQL migrations, JVM memory |
| Python and FastAPI | Concise API development and accessible syntax | Compose authentication, migrations, worker lifecycle, and scheduling explicitly |
| Earlier managed backend proposal | Less backend infrastructure to operate | Does not teach a Java/Python application as the main backend |

The selected backend baseline is Java 25 and Spring Boot 4.0.8, configured in `profile-backend/pom.xml`. Treat these as this project's pinned baseline, not a claim that they are the newest available releases. Review Spring's compatibility matrix before upgrading; avoid preview releases. [S1]

## Application boundaries

Build a modular monolith: one backend application with clear content, account, inquiry, publishing, and operations packages. Controllers handle HTTP, services enforce business rules, repositories handle database access, and adapters communicate with email, storage, identity, and secrets providers.

The browser communicates with the API over HTTPS. The API validates tokens and permissions before PostgreSQL access. PostgreSQL stores durable truth. Redis holds disposable copies of public responses. A durable outbox stores work to be processed; a scheduler wakes the processor. Private files require API authorization.

For the low-cost production option, a reverse proxy serves React assets and routes /api to the Java container. PostgreSQL and Redis remain on an internal Docker network. Only HTTPS and restricted administration access are exposed. An external identity provider handles login. Independent backup storage protects against losing the server.

## Add AI after the core product works

First complete and deploy the Java application. Then prototype portfolio Q&A over published content with source citations, an evaluation dataset, privacy checks, and spending limits. Use Python locally for retrieval and evaluation experiments. Keep accounts, authorization, content, and publishing in Java. Add a Python service only if a measured requirement justifies its deployment and maintenance cost. FastAPI deployment guidance is retained for that optional later stage. [S15]

Completion evidence: draw one request and one background task through the system, naming every trust boundary. Decision still required: the maximum ongoing monthly budget and hosting ownership.

# 4 Price the production choices

## Minimum operating footprint

The proposed low-cost target is one AWS Lightsail Linux server with public IPv4, 4 GB RAM, and 80 GB disk. Its listed base price is $24/month. A 2 GB server is $12/month, but use it only after memory and load tests demonstrate enough room for Java, PostgreSQL, Redis, and the operating system. These prices exclude additional services and tax. [S2]

| Component | Proposed monthly amount | Basis |
|---|---:|---|
| Lightsail 4 GB server | $24 | Listed Linux IPv4 bundle |
| PostgreSQL and Redis | $0 separate subscription | Consume server memory, CPU, and disk |
| Cognito Lite or Essentials | $0 within applicable free tier | Up to 10,000 direct/social active users; exclusions apply |
| Contact email | $0 within Resend Free allowance | 3,000/month and 100/day |
| Backups and small file storage | $2–5 allowance | Estimate; depends on retained versions and requests |
| Domain renewal allocation | $1–2 allowance | Estimate; verify current registrar renewal |
| Monitoring and transfer reserve | $2–5 allowance | Estimate; existing quotas and usage determine bill |
| Planning total | $29–36 | Use a $40/month planning ceiling pending approval |

Cognito's direct/social allowance differs from external SAML/OIDC federation, which has a 50-user free allowance. Token requests for machine identities and messaging can add charges. Do not route all existing Auth0 users through Cognito and assume the larger allowance applies. [S3]

Retain Auth0 while building locally. Before production, compare keeping its current tenant against moving to Cognito. Auth0 advertises a free tier and a $35/month Essentials tier at 500 users; required MFA entitlements must be checked. If paid Auth0 is needed, add that bill to the estimate. Never remove admin MFA to meet the budget. Cognito TOTP support is documented. [S4, S5]

## Managed alternative and growth

Using a $12 API server plus a $25 Supabase Pro database gives a $37 base before files, backups, authentication extras, and monitoring; allow roughly $42–55. This reduces database operations but still needs region/network planning and load tests. Redis can remain beside the API. A multi-node enterprise deployment needs a separate quote and recovery design. [S2, S6]

The low-cost option trades operating time and server availability for a smaller bill. Paid staging, enterprise support, continuous point-in-time recovery, and a production Vault cluster are outside this estimate. Record actual usage weekly. Cost alerts are notifications, not automatic spending caps. Email pricing: [S7].

# 5 Establish the local development baseline

## Learn

A runtime executes code; a package manager resolves libraries; a build produces an artifact. A container packages a process and dependencies. A database volume persists data independently of the container that uses it.

## Work in order

1. Inspect git status. Preserve the substantial existing changes; agree on an isolated branch or worktree before product implementation.
2. Run the existing UI tests and build. Record exact commands, result counts, and date in AI_MEMORY.md.
3. Install a supported JDK, Maven wrapper, supported Node LTS, Docker/Compose, Git, and an editor. Record versions. Reconcile existing Node 20 workflow settings with the supported version chosen at implementation.
4. Keep React in its current location. Plan backend/ for Java, infra/ for containers and provisioning, docs/adr/ for decisions, and docs/runbooks/ for operating procedures.
5. Add backend dependencies for web, validation, security/resource server, persistence, migrations, Redis, health checks, and PostgreSQL. Pin through a compatible Spring Boot dependency management release.
6. Build one GET /api/health response before introducing persistence. Keep detailed operational health endpoints private.
7. Start PostgreSQL and Redis locally through Compose, using disposable development credentials and persistent named volumes.
8. Configure Vite to proxy /api to localhost:8080. Use same-origin /api URLs in the React client to reduce environment mismatch.

## First commands after those files exist

```bash
npm ci
npm run test:run
npm run build
cd backend
./mvnw verify
./mvnw spring-boot:run
```

The backend directory and Maven wrapper are future outputs. These commands are instructions for that milestone, not commands already verified against this repository.

Completion evidence: React calls the local health endpoint and displays a result; stopping the API creates a useful error state. Exercise: identify which process owns ports 5173, 8080, 5432, and 6379, and which need to be publicly reachable.

# 6 Model data and preserve content

## Learn

Primary keys identify records. Foreign keys connect them. Constraints reject invalid data. Transactions commit related changes together. A migration is an ordered, reviewed database change.

## Work in order

1. Create a schema diagram for user_profiles, admin_memberships, experiences, projects, case_studies, expertise, site_content, media_assets, contact_messages, content_revisions, publication_jobs, outbox_events, job_runs, and audit_events.
2. Store identity issuer and subject as a unique pair. Do not use email as an immutable identity key.
3. Give editable records a version number, created_at, updated_at, and actor information. Store career dates as real dates with display precision, not arbitrary strings alone.
4. Keep draft revisions separate from the selected published revision. Public queries only read the published snapshot.
5. Write Flyway migrations in backend/src/main/resources/db/migration. Start with additive SQL. Use a separate migration database role; the application role cannot change schema.
6. Seed the current portfolio content using an import with stable IDs and a transaction. Compare record counts and rendered values against the source data.
7. Add indexes for published reads, user identity lookups, pending events, and inbox sorting. Use EXPLAIN ANALYZE on representative queries.
8. Test migrations on an empty database and on a copy of the prior schema. Document rollback compatibility before production.

## Concurrency example

Admin opens experience version 7. Another save creates version 8. An update requiring version 7 must return a conflict rather than silently overwriting version 8. Use JPA optimistic locking or an explicit version predicate and return HTTP 409.

Avoid automatic schema mutation such as production ddl-auto:update. In production use validate after reviewed migrations. With a private database and Java-only access, application authorization is the primary boundary; do not assume Supabase row-level policies automatically protect a privileged JDBC connection.

Completion evidence: a clean database can be created and seeded reproducibly, invalid dates fail validation, and two simultaneous edits produce a clear conflict. Exercise: distinguish a database rollback from rolling back an application container.

# 7 Build and test the Java API

## Learn

An HTTP contract describes methods, paths, input, output, and errors. DTOs keep the public API separate from persistence entities. Validation protects both users and the service.

## Work in order

1. Implement a public GET /api/site response from the published snapshot. Define a versioned response schema and exclude private fields explicitly.
2. Add GET and PATCH /api/me. Derive identity from the validated access token. Do not accept a caller-selected account owner.
3. Add admin CRUD routes for each inventory item. Keep authorization centralized and test it at the API boundary.
4. Add POST /api/contact with length limits, spam verification, idempotency key, and durable acceptance.
5. Port GET /api/resume from Node to Java, retaining token checks and private response headers. Keep the Node handler until the replacement proves equivalent.
6. Use consistent errors: 400 validation, 401 invalid/missing authentication, 403 forbidden, 404 absent, 409 conflict, 429 rate limit, and 503 unavailable dependency. Return request IDs without stack traces.
7. Publish an OpenAPI contract for development and generate or validate TypeScript types against it.
8. Write unit tests for business rules and PostgreSQL integration tests with Testcontainers. Use real transaction behavior for outbox and concurrency tests.

## Suggested package structure

```text
backend/src/main/java/.../portfolio/
  content/       controllers services repositories DTOs
  account/       identity mapping and account rules
  inquiry/       contact acceptance and inbox
  publishing/    revisions and publication jobs
  jobs/          outbox claims and scheduled work
  platform/      security storage email configuration
```

Keep modules understandable independently. Use ordinary Java interfaces at external dependencies so email and storage can be substituted in tests. Never add a second backend language merely to check a technology box.

Completion evidence: contract tests cover normal and rejected requests; a request ID ties an API response to logs. Exercise: trace validation, authorization, transaction commit, and response serialization for one admin save.

# 8 Complete accounts and authorization

## Learn

Authentication establishes identity. Authorization determines permitted actions. OAuth access tokens authorize APIs; ID tokens describe a login and should not replace API access tokens.

## Work in order

1. Preserve Auth0 during local development. Verify issuer, audience, allowed algorithm, signature, expiry, and token type in Spring Security. [S8]
2. Implement account provisioning as an idempotent operation keyed by issuer and subject. Ignore client-supplied role values.
3. Bootstrap the first admin through a controlled server-side operation. Public signup always creates a viewer. Record promotion/revocation in audit history.
4. Require admin MFA and recent authentication for sensitive operations. Validate provider-specific assurance behavior; do not assume every access token has an amr claim.
5. Build registration, email verification, login/logout, recovery, session expiry, profile editing, and account deletion workflows. Keep tokens out of URLs and logs.
6. Prefer authorization code with PKCE for the SPA. If a later backend session uses cookies, add CSRF protection and secure cookie settings; CORS does not replace authorization.
7. Before changing providers, inventory accounts and social connections, map identities, test recovery, and plan reauthentication or password resets. Existing visitor accounts must not be silently lost.
8. For Cognito, validate issuer, signature, expiry, token_use=access, permitted client_id, and intended API scopes/resource audience as configured. Cognito access-token validation is not identical to Auth0 audience validation. Prove admin MFA through a controlled native admin pool with required MFA or a tested step-up design. [S3, S5]

## Permission tests

Test anonymous, visitor A, visitor B, admin without required assurance, and admin with assurance. Visitor A must not read or update B by changing an ID. Public users must not read drafts or inquiries. Revoking admin membership must block the next privileged operation.

Completion evidence: all account journeys and rejection cases pass in a staging identity setup. Exercise: explain why successful JWT validation alone does not make its holder an admin.

# 9 Connect React and build the admin workspace

## Work in order

1. Centralize the API client, token attachment, error mapping, and request IDs. Remove competing API base variable names.
2. Add /account, /admin/content, /admin/media, /admin/inbox, and /admin/history routes. Route guards improve navigation; server checks enforce permissions.
3. Replace one hard-coded section at a time with API data. Preserve existing page styles, compositions, accessibility, and career facts.
4. Build form controls for every agreed field. Use Zod and React Hook Form for immediate feedback, plus matching server validation.
5. Add image upload progress, file rejection messages, alternative text, preview, ordering, and archive/restore actions.
6. Add drafts, unsaved-change warnings, publication status, and version-conflict resolution. Avoid optimistic publication when the backend has not confirmed it.
7. Invalidate TanStack Query entries after successful writes. Keep loading, empty, expired-session, retry, and error states usable.
8. Complete the inbox: searchable list, message detail, read/archive state, and delivery status. Initially reply through your mail client; an in-app email composer is a separate product decision.
9. Check desktop/mobile layouts, keyboard navigation, focus after dialogs, labels, and contrast. Add browser tests for the important user journeys.

## Define all fields precisely

“Edit every field” means every agreed content field has an editor and a persisted representation. It does not mean arbitrary JavaScript injection, passwords, cloud keys, or CSS source code become editable website content. Use a constrained rich-text model and sanitize rendered content.

An admin may maintain portfolio content and perform explicitly scoped account administration such as disabling an account. This does not grant unrestricted access to private account data by default.

Completion evidence: change an experience, project image, biography, social link, SEO description, and résumé through the UI; reload and confirm persistence. Exercise: inspect the browser network panel and explain the request, status code, response, and cache invalidation after a save.

# 10 Publish content and keep SEO current

## Learn

The current build generates static HTML. Updating only browser JSON would leave search engines and social previews with older content. Publishing therefore has two outputs: public application data and generated HTML.

## Work in order

1. Create immutable published snapshots with revision IDs. Public APIs use the selected revision; previews require admin access.
2. On publish, commit the revision selection and a publication job together. Give the admin a status such as queued, rendering, published, or failed.
3. Adapt the existing React server renderer to consume a supplied snapshot. Run it as a short-lived Node rendering task from the deployed release, not as a replacement Java API.
4. Generate all six public HTML routes, metadata, canonical links, and sitemap into a new release directory. Escape all content and reject scripts in CMS input.
5. Embed the same snapshot version for React hydration so the initial browser view matches the generated HTML. Revalidate after hydration if a newer version exists.
6. Validate generated files, then atomically switch the public directory pointer on the same filesystem. Keep the previous directory for rollback.
7. Mark the publication job complete and invalidate affected caches. If rendering fails, keep the last good HTML and show a retryable failure to admin.
8. Serve HTML with revalidation or a short TTL; use immutable caching for hashed JS/CSS. Never include private files in the public directory.

The initial proposal allows a temporary difference between the newest API content and older static HTML, bounded by the five-minute rendering target. If exact simultaneous visibility is required, render first and design a single revision switch for both outputs. Record that stronger requirement before implementation.

Protect public deletion/unpublication separately: purge previously published content promptly and remove its files from active releases. Backups follow their retention policy; they are not public routes.

Completion evidence: publish once and inspect both View Source and the hydrated UI for the same new facts. Simulate renderer failure and confirm visitors still receive the last valid page. Exercise: explain the difference between saving a draft and publishing a revision.

# 11 Add Redis with measurable behavior

## Learn

Cache-aside means the API checks Redis, reads PostgreSQL on a miss, and caches the result. A time-to-live bounds staleness. Redis stores replaceable data in this design. [S9]

## Work in order

1. Measure uncached latency and SQL counts for GET /api/site before adding Redis.
2. Cache only published snapshots. Use keys such as portfolio:public:revision:42 and a short-lived pointer to the active revision.
3. Start with a 60-second TTL on the active pointer. Cache immutable revisions longer. After publication commits, update or invalidate the pointer.
4. Account for racing readers: an older read can repopulate stale data after invalidation. Versioned keys and a bounded pointer TTL keep the behavior understandable.
5. Configure a short Redis timeout and bounded database fallback. Redis failure should not fail the public portfolio or cause unlimited retries.
6. Cap Redis memory and select an eviction policy suitable for disposable cache entries. Expose no Redis port to the public internet.
7. Add metrics for hits, misses, fallback, timeout, and memory. Verify the benefit under representative load.
8. Test cold starts, stale content, publication, Redis restart, and concurrent requests. Keep account, draft, and authorization responses outside shared caches.

## Failure exercise

Warm the public endpoint, stop Redis, and request the page again. It should still read from PostgreSQL within a bounded time. Restart Redis and observe it fill again. The application must not lose experiences or contact messages when Redis is empty.

Redis Pub/Sub does not provide a durable business-event queue. If you later explore Redis Streams, use separate capacity/persistence policies from the evictable cache and prove delivery/recovery behavior.

Completion evidence: measured before/after results and a passing outage test. Exercise: explain why a cache can safely lose all data while the database cannot.

# 12 Make events and notifications durable

## Learn

An event records something that happened. A queue retains work until processed. An in-memory application event disappears on process failure. A transactional outbox stores the event in the same database transaction as the business change.

## Work in order

1. Define events such as InquiryReceived and ContentPublished with event_id, type, schema_version, aggregate_id, timestamp, and minimal payload.
2. In one PostgreSQL transaction, save the inquiry and its outbox event. Return HTTP 202 after commit with a receipt ID. Do not label an email delivered at this point.
3. Create outbox columns for status, attempts, next_attempt_at, lease_until, and last_error. Index due work.
4. Claim a small batch with a short transaction using row locks and SKIP LOCKED, then commit the lease. Perform slow email requests outside that database transaction.
5. Use a stable event ID as a provider idempotency key where supported. Keep a delivery ledger. A crash after send and before acknowledgement can still create uncertainty; explain the provider's idempotency window.
6. Retry transient errors with exponential backoff and jitter. Respect provider rate limits and daily quotas. Move persistent failures to a reviewable dead-letter state.
7. Reclaim expired leases after worker failure. Make reprocessing safe with unique constraints and idempotent business operations.
8. Add admin visibility for pending, sent, failed, and retried notifications. Verify signed delivery webhooks and reject replayed callbacks if webhooks are used.

## Failure exercise

Disable the email adapter, submit an inquiry, and restart the application. The message must remain in the inbox and queued work must resume later. Submit the same request with the same idempotency key twice; it should produce one inquiry. Reusing that key with different content should be rejected.

Start with PostgreSQL durable work to avoid another always-on service. Later map the outbox relay to SQS or RabbitMQ as an optional lab. Kafka becomes relevant for replayable streams and scale requirements; it is not a prerequisite for this product.

Completion evidence: durable acceptance and retry tests pass. Exercise: explain why exactly-once external email delivery cannot be assumed.

# 13 Schedule work without duplicates

## Learn

A scheduler decides when to try work. Durable records decide what work remains. The application must recover if the scheduled time occurs while it is offline. Spring supports scheduled tasks, but scheduling alone does not supply distributed durability. [S10]

## Work in order

1. Define jobs: outbox polling every 10 seconds, publication polling, daily retention cleanup, and daily backup verification. Run actual backups through an independent host timer or backup process.
2. Use UTC for technical schedules. Store user-entered times with an explicit timezone and explain daylight-saving behavior.
3. Give each logical run a unique key such as job_name plus scheduled_date. Store status, start/end times, attempts, and result in job_runs.
4. Use database claims/leases or a tested scheduler lock. Starting two application replicas must not double-send a digest or execute the same destructive cleanup twice.
5. For long work, renew leases safely or choose a duration above expected execution time. If ownership expires, use fencing or idempotent writes so an old worker cannot corrupt newer work.
6. Configure bounded executor pools and avoid overlapping the same job. Network calls need timeouts.
7. Define catch-up policy: retry missed notification jobs, run overdue retention once, and show missed backup verification as an alert.
8. Provide a privileged manual retry with an audit record. Keep scheduler endpoints inaccessible to anonymous callers.

## Cron exercise

Spring's six-field cron includes seconds. The expression 0 0 2 * * * means 02:00:00 daily when the configured zone is UTC. A typical Unix cron uses five fields. Always identify which scheduler owns the expression before copying it.

Completion evidence: start two workers, stop one mid-job, and demonstrate eventual completion without duplicated business effects. Exercise: distinguish a retry, a catch-up run, and a newly scheduled run.

# 14 Learn HashiCorp Vault and secret delivery

## Learn

Vault manages authenticated access to secrets, policies, audit records, leases, and dynamic credentials. A secret manager still needs a secure initial identity. A root token in an environment variable is not a production authentication design.

## Local Vault lab

1. Run Vault in a localhost-only Docker learning profile with synthetic data. Development mode is unsealed and insecure; never deploy it publicly or use it for production secrets. [S11]
2. Enable a KV v2 path for portfolio development secrets. Store a dummy email key and read version history.
3. Create a policy that can read only the application path. Demonstrate a denied request to another path.
4. Authenticate the application with a limited token or AppRole for the lab. Remove root-token use from the app.
5. Configure a development PostgreSQL secrets engine with a narrowly scoped role. Issue short-lived credentials, observe their expiry, renew a lease, and revoke it. [S12]
6. Integrate secret retrieval through a Java adapter or a compatible Spring Vault client. Prove behavior when Vault is unavailable and when credentials rotate.
7. Enable audit logging while protecting the logs. Ensure application logs never print secret values.
8. Stop and reset the disposable lab. Record what persists and what disappears in dev mode.

## Production decision

For the minimal single-server deployment, mount root/deployer-owned secret files into only the services that need them. Use strict permissions, encrypted backup handling, and a rotation runbook. Docker Compose secrets mount files; they do not provide a managed encrypted vault or automatic rotation. [S13]

If production Vault is selected later, budget a separate hardened service with TLS, persistent Raft storage, seal/unseal recovery, backups, least-privilege authentication, audit retention, patching, and recovery drills. A lone Vault container on the same failed server cannot restore that server's secret access by itself.

A managed secret store is another option. AWS Secrets Manager commonly lists $0.40 per secret/month plus API charges; credential delivery still needs a supported workload identity. Do not assume Lightsail has EC2 instance-profile behavior. [S14]

Completion evidence: allowed/denied access, rotation, expiry, and outage tests. Exercise: identify the initial credential that lets an application authenticate to its secret manager.

# 15 Understand YAML by building local services

## Learn

YAML is a data format. The consumer gives it meaning: GitHub Actions interprets jobs, Docker Compose interprets services, and Spring interprets application properties. Indentation defines nesting. Use spaces, quote ambiguous values, and validate with the consuming tool.

## Compose example for a future local file

This teaching example starts infrastructure only. Create ignored .secrets/db_password.txt first. The version tags are illustrative major versions; choose supported patch versions/digests during implementation.

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: portfolio
      POSTGRES_USER: portfolio
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U portfolio"]
      interval: 5s
      timeout: 3s
      retries: 10
  redis:
    image: redis:7.4
    ports:
      - "127.0.0.1:6379:6379"
volumes:
  pgdata:
secrets:
  db_password:
    file: ./.secrets/db_password.txt
```

ports maps host to container; localhost binding limits access. volumes preserves PostgreSQL data. secrets grants a file to a named service. The initial PostgreSQL user is a bootstrap superuser; later migrations create a restricted runtime account. A production override removes database/cache host ports and introduces resource limits, logging limits, private networking, health checks, and controlled restart behavior. [S13, S16]

Validate with docker compose -f compose.yaml config --quiet, then docker compose up -d. Inspect docker compose ps and container logs. A start order alone does not guarantee dependency readiness. Never use docker compose down -v on data you need; it removes named volumes.

Completion evidence: explain every key, restart the database without losing a record, and deliberately introduce an indentation error to observe validation.

# 16 Configure and package the backend

## Application configuration example

The names of mounted secret files become Spring config-tree property names. For example, spring.datasource.password contains the runtime database password. Create the files before enabling this profile.

```yaml
spring:
  config:
    import: "configtree:/run/secrets/"
  datasource:
    url: ${DB_URL}
    username: ${DB_USER}
  jpa:
    hibernate:
      ddl-auto: validate
  data:
    redis:
      host: ${REDIS_HOST:redis}
      port: 6379
management:
  endpoints:
    web:
      exposure:
        include: health,info
```

This is a partial application.yml example. Security, audiences, timeouts, connection pools, and application job settings must be added and tested. Do not expose detailed health data or secret-bearing management endpoints publicly. Non-secret settings can use environment variables; VITE variables are compiled into public browser assets.

## Work in order

1. Use a multi-stage Dockerfile: build with a compatible JDK/Maven environment and run with a smaller supported JRE image.
2. Run the application as a non-root user. Include only the built artifact and required runtime files.
3. Set memory limits based on tests. Account for heap, native memory, threads, PostgreSQL, Redis, and filesystem cache.
4. Add readiness/liveness behavior. A Redis outage should not make an otherwise functional API restart continuously.
5. Pin release images by digest, scan dependencies/images, and produce a software bill of materials.
6. Run the same immutable image in staging and production. Build images in CI so the production host does not need compilers.
7. Build React with npm ci and serve hashed assets through the reverse proxy. Keep the private résumé outside every public asset directory.

Completion evidence: start the packaged service with external configuration, verify it runs as non-root, and confirm missing mandatory secrets fail safely. Exercise: distinguish a Dockerfile, compose.yaml, application.yml, and an environment file.

# 17 Build CI and deployment YAML

## Work in order

1. Extend the existing CI to run frontend lint, unit tests, build, backend unit/integration tests, and important browser journeys.
2. Add contract checks, migration tests, authorization tests, and secret/dependency scanning. Test fixtures must not contain real personal data.
3. Build immutable frontend/API artifacts tagged with the commit ID. Store test summaries and checksums.
4. Keep pull-request jobs unable to access production secrets. Separate CI from deployment and use a production environment with restricted permissions.
5. Create the deployment workflow only after infrastructure and rollback steps are proven manually in a disposable environment.
6. Prefer GitHub OIDC for cloud API access. Restrict the trust policy to the intended repository, branch/environment, and audience. OIDC authenticates cloud API calls; it does not automatically grant SSH access to a server. [S17]
7. For the small server, use a dedicated, restricted deployment SSH key or a separately designed pull agent. Verify SSH host keys; never disable verification. Allow the deployment identity only the required release operations.
8. Run one controlled migration, deploy the exact tested image, probe readiness, smoke-test public and protected routes, and switch the release.

## CI teaching excerpt

This excerpt only shows job structure. backend/ and its wrapper are planned files. Pin actions to reviewed commit SHAs in the implemented workflow.

```yaml
name: Portfolio CI
on: [push, pull_request]
permissions:
  contents: read
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "25"
          cache: maven
          cache-dependency-path: backend/pom.xml
      - run: ./mvnw --batch-mode verify
        working-directory: backend
```

Add frontend jobs separately. Explain on, permissions, jobs, runs-on, uses, with, run, working-directory, needs, environment, secrets, and concurrency before adding deployment. CI syntax checks cannot prove a release works.

Completion evidence: a deliberately failing test prevents artifact promotion. Exercise: explain why a production deployment should use the previously tested image rather than rebuilding different bytes.

# 18 Deploy in a controlled sequence

## Before creating billable resources

Review the provider, region, instance size, identity decision, backup destination, budget, and maintenance ownership. The proposed architecture is not approval to purchase services or change DNS. Use a preview hostname before changing the existing domain.

## Deployment runbook

1. Choose the region near the audience and record a dated cost estimate. Enable account MFA and spending alerts.
2. Write infrastructure as code for the selected host/network/DNS resources using Terraform HCL or an equivalent supported tool. HCL is a different language from YAML. Keep state encrypted and access-controlled; state can contain secrets.
3. Provision the server and a stable IP. Restrict SSH to approved sources, install updates, and expose only required HTTP/HTTPS ports. Block public database, cache, and Vault access.
4. Install Docker and the deployment identity. Configure log rotation and disk alerts. Prepare secret files through a protected out-of-band step.
5. Start PostgreSQL, run migrations with the migration role, import verified content, and create the controlled admin membership.
6. Deploy the API, Redis, React assets, and reverse proxy. Route /api first, static public routes next, and the SPA fallback last. API errors must never return index.html.
7. Configure the identity provider's exact HTTPS callback/logout URLs and permitted origins for the preview host. Configure email sender domain records and test with an address you control.
8. Obtain TLS certificates, test renewal, and configure secure headers and appropriate cache behavior.
9. Enable independent backups and complete a restore drill before accepting real account and inquiry data.
10. Run the release checklist from chapter 19. Lower DNS TTL in advance, switch the real domain, and monitor errors, login, email, and certificate behavior.
11. Keep the previous release and original Firebase deployment available for a bounded rollback period. Retire old infrastructure after the agreed observation period and verify billing stops.

## Rollback rule

Switch back to the previous compatible application image and assets if smoke tests fail. Expand database schema before changing readers/writers; remove old fields in a later release. Rolling back an image cannot undo an incompatible migration safely. Restoring a database backup can lose later writes and requires an explicit recovery decision.

Completion evidence: perform a preview deployment, an intentional failed rollout, and a successful rollback before the real cutover.

# 19 Prove production quality

## Release checklist

| Area | Required evidence |
|---|---|
| Content | Every inventoried field edits, persists, previews, and publishes |
| Accounts | Registration, verification, recovery, logout, own-profile editing, deletion |
| Authorization | No cross-account access; no viewer write; admin assurance enforced |
| Files | Protected résumé stays private; uploads reject unsafe content |
| Events | Accepted inquiry survives email outage and application restart |
| Cache | Redis outage degrades gracefully; publication staleness stays bounded |
| Scheduler | Two workers do not duplicate business effects; missed jobs recover |
| Delivery | CI gates release; migrations and rollback rehearsed |
| Recovery | Database and media restore to a fresh host within measured target |
| Operations | Alerts, logs, cost report, retention, and patch owner documented |

## Backups and recovery

Back up PostgreSQL consistently, copy media separately, and keep deployment manifests and encrypted recovery instructions. Store copies outside the production server's failure boundary. Retain, for example, seven daily and four weekly copies initially, subject to measured size and agreed retention.

Restore into an isolated environment. Confirm counts, publication revisions, login mappings, media hashes, permissions, and application startup. Record recovery point and elapsed recovery time. A database dump command succeeding is not proof that recovery works. Never test restoration over the only production copy.

## Observability and load

Use structured logs with correlation IDs, latency/error metrics, database pool metrics, Redis hits/misses, queue age, job failures, disk usage, and independent uptime checks. Redact tokens, passwords, and inquiry text. Start with lightweight tooling; run heavier Prometheus/Grafana/OpenTelemetry labs locally before paying for always-on capacity.

Run representative traffic, then a short 10x burst. Measure p95 latency, errors, JVM memory, connection count, and disk growth. Proposed 500 ms API p95 is a test target, not a claim. A single server can meet good response-time targets while still having planned downtime and a single point of failure.

Completion evidence: signed-off checklist, successful restore, failed-dependency exercises, and an actual monthly bill estimate based on measurements. Exercise: distinguish an availability objective, a provider SLA, and a measured result.

# 20 Follow the teaching milestones

| Milestone | Suggested sessions | Deliverable and explanation |
|---|---|---|
| Baseline and decisions | 1–2 | Explain current gaps, permissions, budget, and architecture |
| Local tools and first API | 3–4 | Trace React request through Java to a response |
| PostgreSQL and migrations | 5–7 | Create/seed database and explain transactions |
| Accounts and security | 8–10 | Prove identity, ownership, admin MFA, and recovery |
| Admin CMS and files | 11–14 | Edit every agreed content field through the website |
| Publishing and Redis | 15–17 | Explain snapshot consistency and bounded cache staleness |
| Events and schedulers | 18–20 | Recover queued work and avoid duplicate effects |
| Vault lab | 21–22 | Demonstrate policy, lease, revocation, and rotation |
| Packaging and YAML | 23–25 | Explain each configuration and run immutable artifacts |
| Deployment and recovery | 26–29 | Release, roll back, restore, and measure cost |
| Final architecture review | 30 | Explain tradeoffs and justify the next scaling decision |

Sessions are learning units, not fixed days. Each should end with a small working result and an evidence entry. Split a session if prerequisites or debugging require more time.

## Teaching contract for every AI assistant

Explain one concept in plain language before editing. State which file changes and why. Show the smallest useful example, ask the learner to predict behavior, perform the change, run checks, and explain the observed result. Let the learner inspect meaningful YAML and SQL instead of hiding configuration behind generators.

Use five recurring questions: What problem does this component solve? What data does it own? Who can call it? What happens when it fails? What does it cost?

## Enterprise growth laboratory

After the portfolio is reliable, move one workload to SQS, evaluate managed PostgreSQL with stronger recovery, add a second API replica and prove scheduler coordination, and explore tenant isolation with adversarial tests. Compare workloads that justify Kubernetes, Kafka, regional failover, or a Vault cluster. Each experiment needs a cost ceiling and teardown procedure.

Completion evidence: explain the whole application without naming tools first. Start with users, data, trust, reliability, and cost; then map those requirements to technologies.

# 21 Keep a model independent project memory

## Files and authority

AI_MEMORY.md at the repository root is the concise handoff. This Markdown workbook is the editable source for the Word document. docs/solutions-architecture-plan.md remains historical research and points to this revision. The current user instructions and actual repository evidence take precedence over old proposals.

## Resume protocol

1. Read AI_MEMORY.md, applicable AGENTS.md instructions, and the current guide.
2. Inspect git status and relevant files. Do not reset, overwrite, or commit unrelated work.
3. Separate confirmed requirements, draft recommendations, implemented behavior, and verified behavior.
4. Identify the next incomplete milestone and the smallest reviewable change.
5. Confirm unresolved material choices before dependent implementation. Do not turn this workbook into implied authorization to buy services or deploy.
6. Run checks appropriate to the change. Record exact commands, outcomes, and limitations.
7. Update memory at the end of each session; regenerate the Word document when the teaching plan changes materially.

## Memory update rules

Use plain Markdown and relative paths so any model can read it. Store decisions with date, reason, and status. Record blockers, migration state, relevant test results, and next steps. Keep a short recent session log; move older detail into docs/session-log.md when necessary.

Never store API keys, tokens, passwords, cloud credentials, private account records, or full contact inquiries in memory. Record secret names and their storage location only. Never claim a test passed because an older document said it did.

The initial implementation baseline is now in place. See the implementation record below for what exists and how it was checked. Production rollout and operating evidence remain pending.

Completion evidence: a new assistant can identify the active milestone, chosen stack, open decisions, current verification status, and next safe action without reading the entire chat.

# 22 Implementation record (October 7 2026)

The application now has a local Java 25 / Spring Boot backend in `profile-backend` and React/TypeScript UI integration in this project. The backend uses PostgreSQL/Flyway for durable records, Redis for optional short-lived caching, Auth0 access-token validation, MFA-gated admin operations, versioned drafts, publish jobs, contact inquiry capture, and private resume/media endpoints. The React account, editor, and inquiry routes call these APIs. Local Compose, separate `dev`/`test`/`prod` configuration, a constrained production container template, root GitHub CI, and an image packaging script are present.

Learning sequence you can repeat:

1. Start the local Postgres and Redis services: `cd profile-backend && ./scripts/setup-local.py && docker compose up -d`.
2. Start the API: `./scripts/dev.sh`. In another terminal run `cd profile-ui && npm run dev:backend`. The UI proxies `/api` to the API. Public pages remain browseable; account features require a configured Auth0 tenant and API audience.
3. Explore schema changes under `profile-backend/src/main/resources/db/migration`. Make a new numbered Flyway migration; never hand-edit an already applied migration.
4. Run the backend suite with `./mvnw verify` and the UI suite/build with `npm run lint && npm run test:run && npm run build`.
5. Build the UI renderer and image with `profile-backend/scripts/package-image.sh`; inspect the image and publish it only after a reviewed CI run. Production compose reads secrets from files and expects an immutable image digest.
6. Before any public launch, set real production identity/email secrets, configure TLS/domain routing, test upload limits and authorization, exercise backup restore and rollback, measure cost and latency, and rehearse incident response. The production template is not a hosted production system.

Current verification record (October 7 2026): backend Maven verify passes all 24 tests; 176 UI tests pass; UI TypeScript/Vite build and six static routes pass; lint has zero errors and eight Fast Refresh warnings. Production credentials, real Auth0 MFA, external email, a deployed endpoint, a successful recovery test, and live operating cost are not verified. The CI workflow is a template at the outer repository root and must run on GitHub before release.

# 23 References and decision checkpoints

Official sources consulted October 4 2026. Recheck versions, quotas, and pricing before purchasing or pinning dependencies. Examples in this workbook are educational fragments; integration testing is still required.

- S1 Spring Boot system requirements — https://docs.spring.io/spring-boot/system-requirements.html
- S2 AWS Lightsail pricing — https://aws.amazon.com/lightsail/pricing/
- S3 Amazon Cognito pricing — https://aws.amazon.com/cognito/pricing/
- S4 Auth0 pricing — https://auth0.com/pricing
- S5 Cognito TOTP MFA — https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa-totp.html
- S6 Supabase pricing — https://supabase.com/pricing
- S7 Resend pricing — https://resend.com/pricing
- S8 Spring Boot OAuth resource server configuration — https://docs.spring.io/spring-boot/reference/security/oauth2.html
- S9 Redis cache-aside — https://redis.io/docs/latest/develop/use-cases/cache-aside/
- S10 Spring scheduling — https://docs.spring.io/spring-framework/reference/integration/scheduling.html
- S11 Vault development server limitations — https://developer.hashicorp.com/vault/docs/concepts/dev-server
- S12 Vault database secrets engine — https://developer.hashicorp.com/vault/docs/secrets/databases
- S13 Docker Compose secrets — https://docs.docker.com/compose/how-tos/use-secrets/
- S14 AWS Secrets Manager pricing — https://aws.amazon.com/secrets-manager/pricing/
- S15 FastAPI deployment concepts — https://fastapi.tiangolo.com/deployment/concepts/
- S16 Docker Compose service reference — https://docs.docker.com/reference/compose-file/services/
- S17 GitHub OIDC for AWS — https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws

## Decisions to make before product implementation

Java and Spring Boot are selected. Confirm the monthly ceiling and willingness to maintain a server. Confirm account fields, admin MFA approach, identity provider migration, recovery objectives, and publication freshness. Review the field inventory before promising complete editing coverage.

## Conditions for completion of the product

The product is complete when the agreed features operate through the deployed website, authorization and failure tests pass, release/rollback and recovery are demonstrated, costs are understood, and the owner can explain and repeat the workflow. A generated document or a successful frontend build alone does not establish that outcome.
