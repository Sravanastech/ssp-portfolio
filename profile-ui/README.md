# ssp_profile_ui

Profile application to display work information.

## Local development

1. `cp .env.example .env.local` and fill in the public Auth0 / Web3Forms values.
2. Start the Java backend (`profile-backend/scripts/dev.sh`, port 8080). The Vite dev server proxies `/api/**` to `VITE_API_URL` (default `http://127.0.0.1:8080`).
3. `npm run dev` (port 5173).

Content is static. The contact form posts to `/api/contact` (Turnstile-verified; messages land in the admin Inbox). Set `VITE_CONTACT_MODE=web3forms` at build time to fall back to Web3Forms. The backend also serves `/api/resume`, `/api/me` and admin endpoints.
Release builds: run `node scripts/prepare-release.mjs` first; it fails if production values are missing or point at localhost.
