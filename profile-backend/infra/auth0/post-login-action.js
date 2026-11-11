/**
 * Auth0 Action: Login / Post Login. Name: "Emit MFA claim".
 *
 * Why: the backend (AdminAuthorization) requires proof of MFA for admin endpoints. Auth0 does not
 * let Actions overwrite the reserved `amr` claim on access tokens (api.accessToken.setCustomClaim
 * only accepts namespaced, non-reserved names), so we emit a namespaced claim instead. The backend
 * accepts either `amr` containing "mfa" or `https://sravanasparimi.com/amr` containing "mfa".
 * The namespace must match AdminAuthorization.AMR_CLAIM.
 *
 * Deploy (Auth0 Dashboard):
 *   1. Actions > Library > Build Custom > Name "Emit MFA claim", Trigger "Login / Post Login", Runtime Node 22.
 *   2. Paste this file, Deploy.
 *   3. Actions > Triggers > post-login: drag the action into the flow, Apply.
 *
 * Enforce MFA for the admin (owner) account:
 *   - Security > Multi-factor Auth: enable at least one factor (e.g. WebAuthn/Passkey or OTP authenticator).
 *     Policy "Never" + the rule below, or "Adaptive"; do NOT leave "Never" without enforcement.
 *   - Enforcement option A (simple): in this same Action, challenge MFA for the admin email (see ENFORCE below).
 *   - Enforcement option B: set the policy to "Always" if only you sign in with MFA-capable accounts (visitors then
 *     need MFA too, which is undesirable for a public resume gate, so prefer A).
 *   - Then promote your account to admin in the DB (accounts.is_admin) after first login; admin endpoints will
 *     reject tokens without the MFA claim.
 */
exports.onExecutePostLogin = async (event, api) => {
  const NAMESPACE = 'https://sravanasparimi.com/';
  const ADMIN_EMAILS = ['sravan@thedevtag.com']; // owner account(s) that must always use MFA. Edit as needed.

  const isAdminCandidate = event.user.email_verified && ADMIN_EMAILS.includes((event.user.email || '').toLowerCase());
  const hasMfa = () => (event.authentication?.methods || []).some((m) => m.name === 'mfa');

  // ENFORCE: force an MFA challenge for admin accounts (needs an enrolled factor; Auth0 prompts to enroll).
  if (isAdminCandidate && !hasMfa()) {
    api.authentication.challengeWithAny([{ type: 'otp' }, { type: 'webauthn-roaming' }, { type: 'webauthn-platform' }]);
  }

  // Emit the claim ONLY when MFA actually happened in this session (event.authentication.methods contains
  // "mfa"). Never emit it from the email address alone: if the challenge above cannot run (for example no MFA
  // factor is enabled in Security > Multi-factor Auth), the user would otherwise get an "mfa" claim without any
  // second factor. Failing closed here means the admin API answers 403 until MFA really works.
  // After a challenge completes Auth0 runs this Action again, and then hasMfa() is true.
  if (hasMfa()) {
    api.accessToken.setCustomClaim(NAMESPACE + 'amr', ['mfa']);
    api.idToken.setCustomClaim(NAMESPACE + 'amr', ['mfa']);
  }
};
