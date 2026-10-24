import { createContext, useContext } from "react";
import type {
  GetTokenSilentlyOptions,
  LogoutOptions,
  RedirectLoginOptions,
  User,
} from "@auth0/auth0-react";

/**
 * Lazy auth facade. Everything outside src/auth/Auth0Bridge.tsx talks to this
 * context so the Auth0 SDK stays out of the public-page bundle.
 */
export type AuthMethods = {
  loginWithRedirect: (options?: RedirectLoginOptions) => Promise<void>;
  logout: (options?: LogoutOptions) => Promise<void>;
  getAccessTokenSilently: (
    options?: GetTokenSilentlyOptions,
  ) => Promise<string>;
};

export type AuthSnapshot = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | undefined;
  error: Error | undefined;
};

export type AuthContextValue = AuthSnapshot & AuthMethods;

const notReady = async (): Promise<never> => {
  throw new Error("Authentication provider is not mounted.");
};

export const AuthContext = createContext<AuthContextValue>({
  isLoading: false,
  isAuthenticated: false,
  user: undefined,
  error: undefined,
  loginWithRedirect: notReady,
  logout: notReady,
  getAccessTokenSilently: notReady,
});

export const useAuth = (): AuthContextValue => useContext(AuthContext);

/** Non-secret hint that a session likely exists, so the SDK can restore it. */
export const AUTH_HINT_KEY = "auth.hint";

export function hasAuthHint(): boolean {
  try {
    return localStorage.getItem(AUTH_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAuthHint(on: boolean) {
  try {
    if (on) localStorage.setItem(AUTH_HINT_KEY, "1");
    else localStorage.removeItem(AUTH_HINT_KEY);
  } catch {
    /* storage unavailable: the hint is an optimization only */
  }
}
