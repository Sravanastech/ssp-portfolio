/**
 * Auth0 Action 1 of 2. Name: "Challenge admin MFA". Trigger: Login / Post Login.
 *
 * Auth0 runs Actions in order. After this Action asks for a second factor, the user completes the MFA
 * screen and the flow RESUMES AT THE NEXT ACTION. This Action does not run again, and the MFA result is
 * only visible to the next Action ("2-emit-mfa-claim.js"). Keep this one directly BEFORE that one.
 *
 * Users already enrolled in a factor get a challenge. Users with no factor get an enrollment screen
 * (challengeWith* needs an enrolled factor; enrollWith* creates one).
 *
 * MFA is required when the app requests it (acr_values = multi-factor, sent by the /admin sign-in) or
 * when the verified email is in ADMIN_EMAILS.
 *
 * Prerequisite: enable the factors in Auth0 Dashboard > Security > Multi-factor Auth
 * (One-time Password and/or WebAuthn). Leave the policy on "Never"; this Action challenges admins only.
 */
exports.onExecutePostLogin = async (event, api) => {
  // Owner/admin accounts that must always use MFA. Edit in the dashboard copy as needed.
  const ADMIN_EMAILS = ['admin@sravanasparimi.com'];

  // The admin UI asks for MFA with acr_values, so invited editors need no edit to this Action.
  const MFA_ACR = 'http://schemas.openid.net/pape/policies/2007/06/multi-factor';
  const requested = (event.transaction?.acr_values || []).includes(MFA_ACR);
  const email = (event.user.email || '').toLowerCase();
  const isListed = event.user.email_verified === true && ADMIN_EMAILS.includes(email);
  const hasMfa = (event.authentication?.methods || []).some((m) => m.name === 'mfa');
  if (!(requested || isListed) || hasMfa) return;

  const factors = [{ type: 'otp' }, { type: 'webauthn-roaming' }, { type: 'webauthn-platform' }];
  const enrolled = (event.user.enrolledFactors || []).length > 0;
  if (enrolled) api.authentication.challengeWithAny(factors);
  else api.authentication.enrollWithAny(factors);
};
