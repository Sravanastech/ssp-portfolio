/**
 * Auth0 Action 2 of 2. Name: "Emit MFA claim". Trigger: Login / Post Login. Must run AFTER
 * "Challenge admin MFA" (1-challenge-admin-mfa.js).
 *
 * Why: the backend (AdminAuthorization) requires proof of MFA for admin endpoints. Auth0 does not let
 * Actions overwrite the reserved `amr` claim on access tokens, so we emit a namespaced claim. The backend
 * accepts `amr` containing "mfa" or `https://sravanasparimi.com/amr` containing "mfa"
 * (must match AdminAuthorization.AMR_CLAIM).
 *
 * The claim is emitted ONLY when Auth0 reports that MFA really happened in this session
 * (event.authentication.methods contains "mfa"). Never from an email address alone: if MFA cannot run
 * (no factor enabled, not enrolled), no claim is set and the admin API answers 403 (fail closed).
 * Because this Action runs after the challenge Action, it sees the completed MFA result.
 *
 * Deploy (Auth0 Dashboard): Actions > Library > Build Custom, trigger "Login / Post Login", paste, Deploy.
 * Then Actions > Triggers > post-login: order must be Start -> Challenge admin MFA -> Emit MFA claim -> Complete. Apply.
 */
exports.onExecutePostLogin = async (event, api) => {
  const NAMESPACE = 'https://sravanasparimi.com/';
  const hasMfa = (event.authentication?.methods || []).some((m) => m.name === 'mfa');
  if (!hasMfa) return;
  api.accessToken.setCustomClaim(NAMESPACE + 'amr', ['mfa']);
  api.idToken.setCustomClaim(NAMESPACE + 'amr', ['mfa']);
};
