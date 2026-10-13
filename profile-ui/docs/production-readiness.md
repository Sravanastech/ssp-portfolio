# Final polish and production readiness

## Changes and reasons

- Confirmed Kroger ends May 31, 2026 and Fifth Third starts June 1, 2026; month/year dates make the chronology accurate and easy to scan.
- Added FISA's other payroll-related projects alongside CityTime; this captures the owner's broader scope without conflating separate applications.
- Sharpened Fifth Third resume bullets around React interfaces, Java/Spring Boot services, Storybook libraries, and reusable starters; concrete deliverables make the role easier to assess.
- Moved palette and composition selectors to footer Appearance settings; visitors can focus on career information first.
- Added a header light/dark button and native browser color-scheme setting; appearance stays convenient and browser controls match the selected mode.
- Added a finite diagram drawing/plane-reveal sequence when selecting engineering layers; motion explains the selected relationship and respects reduced motion.
- Corrected settings-panel text contrast across palettes; expanded settings must be as readable as the main content.

## Motion research

Reviewed the public content of [Bruno Simon's interactive portfolio](https://bruno-simon.com/) and [Linear's product site](https://linear.app/), plus [Motion's reduced-motion guidance](https://motion.dev/docs/react-use-reduced-motion). Their relevant lessons here are an interaction tied to the subject and clear responses to visitor input. The implemented interpretation is a bounded engineering-diagram sequence, using existing CSS and no new animation dependency. Text-only research does not establish a frame-by-frame comparison or a “best website” ranking; some award and portfolio pages were inaccessible.

## Release assessment

The UI and resume changes have passed a production build, 156 unit tests, and visual inspection of desktop/mobile screenshots and all three PDF pages. Lint has no errors and four existing Fast Refresh warnings. The initial 19-test browser run passed 18 and identified a settings contrast failure, which was corrected. The contrast test subsequently passed across all palettes/compositions, and an additional reduced-motion test passed. All 20 browser cases have now passed across the full run and targeted confirmations. The 10 resume authentication tests also passed under Vitest.

**Not fully production-ready under the current deployment configuration.**

1. `firebase.json` rewrites all unmatched requests to `/index.html`. The deployment workflow deploys hosting only. `/api/resume` requires `server/index.mjs`, and `/api/events` uses the same service. Deploy that service with `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, and access to the private PDF; configure specific API rewrites before the SPA fallback. No backend service identifier is supplied in this repository, so a real destination cannot be safely invented.
2. The workflow supplies `VITE_API_URL`, while `src/api/UserApi.tsx` reads `VITE_API_BASE_URL`. The optional account callback also depends on a separate `/api/user` service not implemented by this Node server. Its deployed base URL and service availability need confirmation.
3. Production Auth0 callback/origin settings, authenticated PDF retrieval, and real Web3Forms delivery remain unverified. No deployment or real message submission was performed.

The PDF remains outside `dist`; it must never be copied into Firebase's public assets to work around the API deployment gap.
