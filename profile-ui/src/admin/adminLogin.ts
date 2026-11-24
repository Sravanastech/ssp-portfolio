import type { RedirectLoginOptions } from "@auth0/auth0-react";

export const MFA_ACR =
  "http://schemas.openid.net/pape/policies/2007/06/multi-factor";

/** Sign-in for admin surfaces: always asks Auth0 for multi-factor. */
export function adminLoginOptions(returnTo: string): RedirectLoginOptions {
  return {
    appState: { returnTo },
    authorizationParams: { acr_values: MFA_ACR },
  };
}
