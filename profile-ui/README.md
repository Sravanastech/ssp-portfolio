# ssp_profile_ui

Profile application to display work information.

## Local development

1. `cp .env.example .env.local` and fill in the public Auth0 / Web3Forms values.
2. Start the Java backend (`profile-backend/scripts/dev.sh`, port 8080). The Vite dev server proxies `/api/**` to `VITE_API_URL` (default `http://127.0.0.1:8080`).
3. `npm run dev` (port 5173).

Content and the contact form are static (Web3Forms); the backend serves only `/api/resume`, `/api/me` and admin endpoints.
Release builds: run `node scripts/prepare-release.mjs` first; it fails if production values are missing or point at localhost.
