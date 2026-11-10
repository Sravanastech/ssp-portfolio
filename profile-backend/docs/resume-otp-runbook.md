# Resume email OTP runbook

One-time setup and operations for the resume email-OTP feature. Contains no secrets: every
value below is a name or a placeholder. Keep real values in Secret Manager.

Feature flag: `RESUME_OTP_ENABLED` (default `false` in prod). Do the steps in the rollout order at the end.

## 1. Porkbun DNS and Resend sending domain

Mail is sent from a dedicated subdomain, `mail.sravanasparimi.com`, so its reputation stays
separate from the root domain.

1. In Resend, add the domain `mail.sravanasparimi.com` and pick a region.
2. Resend shows the SPF, DKIM and bounce-MX records to create. Copy the values exactly from the
   Resend dashboard; do not retype them from memory.
3. In Porkbun, open DNS for `sravanasparimi.com` and add each record. In the Host field enter only the
   subdomain part Resend shows (for example `send` or `resend._domainkey.mail`), not the full name.
   Porkbun appends `.sravanasparimi.com` itself; entering the full name creates a wrong record.
4. Do NOT edit or remove the existing root-domain MX records (Zoho). The new MX record is for the
   sending subdomain only.
5. Optional but recommended: add a TXT record at host `_dmarc` with value
   `v=DMARC1; p=none; rua=mailto:<a mailbox you read>`. Tighten the policy later, after reading
   a few weeks of reports.
6. Back in Resend, click Verify. Wait until the domain shows Verified (DNS can take minutes to hours).
7. Create an API key with the restricted permission "Sending access" limited to this domain.
   Never use a full-access key. Store it as secret `EMAIL_KEY`.
8. Sender address: `EMAIL_FROM` = `Sravana Parimi <verify@mail.sravanasparimi.com>`.
   Prod policy rejects any sender containing `resend.dev`.
9. Send a real test through the dev stack or the Resend dashboard to your own inbox and check it is
   not in spam. Free-tier limit is 100 mails/day; the app caps itself at 80/day.

## 2. Cloudflare Turnstile

1. Cloudflare dashboard, Turnstile, Add site.
2. Hostnames: `sravanasparimi.com` and `www.sravanasparimi.com` (add only hosts that serve the UI).
3. Widget mode: Managed.
4. The UI widget uses action `resume_otp`; the server rejects any other action.
5. Copy the site key into the UI build variable `VITE_TURNSTILE_SITE_KEY` (public).
6. Store the secret key in Secret Manager as `TURNSTILE_SECRET`. Never commit it.
7. `profile.resume-otp.turnstile.require-action` must be `true` in prod (it is hard-set in
   `application-prod.yml`, and the prod policy refuses to start otherwise). Only dev/test turn it off,
   because Cloudflare's dummy keys return no action.
8. Cloudflare's published dummy keys (`1x000...`, `2x000...`, `3x000...`) are rejected by the prod policy.

## 3. Production configuration

Set these environment variables or mounted secrets. "Required" means startup fails when
`RESUME_OTP_ENABLED=true` and the value is missing or unsafe (enforced by `EnvironmentPolicy`).

| Name | Kind | Requirement |
|---|---|---|
| `RESUME_OTP_ENABLED` | env | `true` to enable; default `false` |
| `EMAIL_MODE` | env | must be `provider` |
| `EMAIL_KEY` | secret | Resend restricted key; startup fails if blank or equal to `none` (case-insensitive) |
| `EMAIL_FROM` | env | verified sender, must not contain `resend.dev` |
| `EMAIL_RECIPIENT` | env | not blank (contact notifications); default `admin@sravanasparimi.com` |
| `OTP_SECRET` | secret | at least 32 bytes, not a `dev-only` value; HKDF derives the code and token keys from it |
| `TURNSTILE_ENABLED` | env | must be `true` (default) |
| `TURNSTILE_SECRET` | secret | real secret, not a Cloudflare dummy key |
| `TURNSTILE_ALLOWED_HOSTNAMES` | env | comma list, default `sravanasparimi.com,www.sravanasparimi.com`; not blank |
| `INQUIRY_IP_SALT` | secret | at least 16 characters; salts the stored IP hashes; keep it secret |
| `ADMIN_OWNER_SUB` | secret/env | your Auth0 user id (see section 4); not blank |
| `OTP_TRUSTED_PROXY_HOPS` | env | integer >= 1, default `1`; set from the staging check in section 5 |

Rotating `OTP_SECRET` immediately invalidates every issued access token and open code.

## 4. Auth0 hardening (manual, one time)

The visitor list is owner-only: it requires an Auth0 admin account, MFA, and `sub == ADMIN_OWNER_SUB`.

1. Owner id: Auth0 dashboard, User Management, Users, open your user, copy the User ID
   (looks like `auth0|...` or `google-oauth2|...`). Set it as `ADMIN_OWNER_SUB`.
2. MFA: enforce MFA for your user with a post-login Action that sets the namespaced claim
   `https://sravanasparimi.com/amr` to include `mfa` only after a real MFA challenge. Confirm a login
   without MFA is refused by the admin API (403).
3. Connections: disable every connection and social login you do not use.
4. Tenant members: Settings, Tenant Members; remove anyone who does not need access and require MFA for them.
5. `is_admin` can only be set by SQL on the `accounts` table; there is no API path.

## 5. Staging check for `trusted-proxy-hops` (Firebase Hosting -> Cloud Run)

The server takes the client IP as the Nth entry counted from the right of `X-Forwarded-For`
(never the leftmost, which clients can forge). Confirm N once in staging.

1. Deploy a staging revision of the backend with `OTP_TRUSTED_PROXY_HOPS=1` and normal logging.
2. Temporarily deploy a throwaway endpoint or short-lived debug log line that prints ONLY the raw
   `X-Forwarded-For` header and remote address, no body, no email, no tokens. Remove it after the test.
3. From a device whose public IP you know (check with an IP-lookup site), call the staging
   site through Firebase Hosting twice: once plainly, and once with a forged header, for example
   `curl -H 'X-Forwarded-For: 6.6.6.6' https://<staging-host>/api/health`.
4. Read the logged header. Count entries from the right until you reach your real IP.
   That count is `OTP_TRUSTED_PROXY_HOPS`. The forged `6.6.6.6` must appear to the left of your IP,
   and must never be the entry you selected.
5. Set the value, redeploy, and remove the debug logging. Delete the log entries after reading them,
   since they contain IP addresses.
6. Re-check: with the final value, a forged leftmost entry must not change which IP the app sees.
   The automated spoofing tests prove the logic; this step proves the real network layout.

## 6. Rollout order

1. Merge backend first, UI second. Deploy with `RESUME_OTP_ENABLED=false`; Flyway applies V9 and V10.
2. Do sections 1 to 4 (DNS and Resend verified, Turnstile site, secrets created, Auth0 done).
3. Run the section 5 staging check and set `OTP_TRUSTED_PROXY_HOPS`.
4. Add the Turnstile origin to the UI CSP (UI branch) and build with `VITE_TURNSTILE_SITE_KEY`.
5. Set `RESUME_OTP_ENABLED=true` and deploy. The service refuses to start if any value in section 3 is unsafe.
6. Smoke test: request a code with your own email, verify, open the resume, then list and delete
   yourself in the admin visitors panel. Watch the Resend dashboard and DMARC reports for a week.
7. Rollback: set `RESUME_OTP_ENABLED=false`. Auth0 sign-in keeps working throughout.

## 7. Deleting a visitor

Visitor emails are kept until the owner deletes them (erasure on request = delete the row).
Code and HMAC rows in `resume_otp_challenge` are purged automatically after 24 hours.

Admin API (owner account with MFA, Bearer Auth0 token):

```
GET    /api/admin/resume-visitors?page=0&size=25     -> find the visitor id
DELETE /api/admin/resume-visitors/{id}               -> 204, or 404 if absent
```

Each list and delete is written to `audit_events` with the row id only, never the email.

SQL (direct DB access; use for emergencies):

```sql
DELETE FROM resume_visitor WHERE email = lower('<visitor email>');
-- optional: remove any remaining short-lived challenge rows for that address
DELETE FROM resume_otp_challenge WHERE email = lower('<visitor email>');
```

Already-issued access tokens are stateless and expire within 30 minutes; to revoke all of them at
once, rotate `OTP_SECRET`.

## 8. Accepted risks

Known limits of the design. They are accepted for a free-tier, single-owner site; revisit if traffic or threat level changes.

1. **The global 80/day send cap is a kill switch.** Anyone able to solve CAPTCHAs in bulk can use up the cap, after which
   the email path answers `503 otp_unavailable` for everyone until the window rolls. Auth0 sign-in keeps working.
   Monitor the Resend dashboard and alert on `otp_unavailable` responses (log-based alert on that error code, which
   carries no personal data).
2. **A victim's daily send quota can be exhausted.** A determined attacker with a CAPTCHA solver can request six codes for
   a victim's address within a day (limit 6/day/email), so the victim cannot request a seventh until the window rolls.
   This is also a nuisance mail path to the victim (at most 6 emails/day, no links).
3. **Email aliases bypass per-email caps.** Gmail-style `+tag` and dotted variants are different addresses to the
   service. The per-IP (10/hour) and global (80/day) caps and Turnstile still apply. Aliases are not collapsed.
4. **The per-IP verify limit keys on the requester's IP.** The verify call is limited by the IP that originally requested
   the challenge (the only IP stored), not necessarily the IP calling verify. Each challenge still has its own five attempts,
   and sends per email are capped, so the guess budget per address is at most 5 x 6 = 30 per day. There is no per-email
   lock on purpose: a third party must not be able to lock a visitor out.
5. **Deleting a visitor does not revoke an issued token.** Access tokens are stateless; a token issued before the
   deletion keeps working until it expires (at most 30 minutes). Rotating `OTP_SECRET` revokes all tokens at once.
6. **429 reveals recent activity for an email.** A `rate_limited` answer for an address shows that a code was recently
   requested for it. The 202 response itself is identical for any valid address.
7. **Client IP depends on the network layout.** Rate limits trust the Nth-from-right `X-Forwarded-For` entry
   (`OTP_TRUSTED_PROXY_HOPS`). This is only safe if clients cannot reach Cloud Run directly: restrict Cloud Run ingress so
   that only Firebase Hosting (via the load balancer or internal ingress settings) can reach the service, otherwise an
   attacker can append their own entries and the chosen entry is attacker-controlled. The hop count must be confirmed in
   staging (section 5) before enabling the feature.
8. **Limit state is partly in memory.** The per-IP request throttle (default 10 request calls and 30 verify calls per minute per IP, config
   `profile.resume-otp.ip-requests-per-minute` and `profile.resume-otp.ip-verifies-per-minute`) lives in each instance's memory and resets on restart or scale-out.
   The database limits (per email, per IP, global) are the durable ones.
9. **Failed sends still use IP and global quota.** When the provider rejects a send, the row is kept (migration V11,
   `send_failed`) so it counts toward the per-IP and global caps, but not toward the per-email cap or the 45 second
   cooldown, so a visitor can retry at once. OTP request bodies are capped at 4096 bytes.
