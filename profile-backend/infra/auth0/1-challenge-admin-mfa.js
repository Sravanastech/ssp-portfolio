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
 * Prerequisite: enable the factors in Auth0 Dashboard > Security > Multi-factor Auth
 * (One-time Password and/or WebAuthn). Leave the policy on "Never"; this Action challenges admins only.
 */
exports.onExecutePostLogin = async (event, api) => {
  // Owner/admin accounts that must always use MFA. Edit in the dashboard copy as needed.
  const ADMIN_EMAILS = ['sravan@thedevtag.com'];

  const email = (event.user.email || '').toLowerCase();
  const isAdminCandidate = event.user.email_verified === true && ADMIN_EMAILS.includes(email);
  const hasMfa = (event.authentication?.methods || []).some((m) => m.name === 'mfa');
  if (!isAdminCandidate || hasMfa) return;

  const factors = [{ type: 'otp' }, { type: 'webauthn-roaming' }, { type: 'webauthn-platform' }];
  const enrolled = (event.user.enrolledFactors || []).length > 0;
  if (enrolled) api.authentication.challengeWithAny(factors);
  else api.authentication.enrollWithAny(factors);
};
