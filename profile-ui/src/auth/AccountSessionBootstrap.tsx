import { useEffect } from "react";
import { useAuth } from "@/auth/auth";
import { ensureAccount } from "@/api/accountApi";

const GUARD_KEY = "account-bootstrapped";

function alreadyBootstrapped(sub: string | undefined): boolean {
  try {
    return sessionStorage.getItem(GUARD_KEY) === (sub ?? "anon");
  } catch {
    return false;
  }
}

function markBootstrapped(sub: string | undefined) {
  try {
    sessionStorage.setItem(GUARD_KEY, sub ?? "anon");
  } catch {
    /* storage unavailable: worst case we repeat a cheap GET */
  }
}

/** Provision the app-owned profile once per browser session after Auth0 sign-in. */
export default function AccountSessionBootstrap() {
  const { isLoading, isAuthenticated, getAccessTokenSilently, user } =
    useAuth();
  const sub = user?.sub;

  useEffect(() => {
    if (isLoading || !isAuthenticated || alreadyBootstrapped(sub)) return;
    void getAccessTokenSilently()
      .then((token) =>
        ensureAccount(token, {
          firstName: user?.given_name,
          lastName: user?.family_name,
        }),
      )
      .then(() => markBootstrapped(sub))
      .catch(() => {
        // The account page retries provisioning and presents a useful error if the API is unavailable.
      });
  }, [
    getAccessTokenSilently,
    isAuthenticated,
    isLoading,
    sub,
    user?.family_name,
    user?.given_name,
  ]);

  return null;
}
