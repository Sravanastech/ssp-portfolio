/**
 * Auth0 Action 1 of 2. Name: "Challenge admin MFA". Trigger: Login / Post Login.
 *
 * Auth0 runs Actions in order. After this Action asks for a second factor, the user completes the MFA
 * screen and the flow RESUMES AT THE NEXT ACTION. This Action does not run again, and the MFA result is
 * only visible to the next Action ("2-emit-mfa-claim.js"). Keep this one directly BEFORE that one.
 *
 * Uses the classic api.multifactor.enable: users with no factor get the enrollment screen, enrolled
 * users get a challenge, using the factors enabled for the tenant. (The challengeWith* / enrollWith*
 * APIs need the separate "Customize MFA Factors using Actions" feature and fail with
 * "MFA customized via PostLogin action but feature is not enabled" without it.)
 *
 * Prerequisite: enable a factor in Auth0 Dashboard > Security > Multi-factor Auth (One-time Password).
 * Leave the policy on "Never"; this Action challenges admins only.
 */
exports.onExecutePostLogin = async (event, api) => {
  // Owner/admin accounts that must always use MFA. Edit in the dashboard copy as needed.
  const ADMIN_EMAILS = ['admin@sravanasparimi.com'];

  const email = (event.user.email || '').toLowerCase();
  const isAdminCandidate = event.user.email_verified === true && ADMIN_EMAILS.includes(email);
  const hasMfa = (event.authentication?.methods || []).some((m) => m.name === 'mfa');
  if (!isAdminCandidate || hasMfa) return;

  api.multifactor.enable('any', { allowRememberBrowser: false });
};
