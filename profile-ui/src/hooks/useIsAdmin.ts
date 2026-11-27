import { useEffect, useState } from "react";
import { useAuth } from "@/auth/auth";
import { accountRequest } from "@/api/accountApi";

const cache = new Map<string, Promise<boolean>>();

/** Test helper: forget cached admin lookups. */
export function resetIsAdminCache() {
  cache.clear();
}

/** True when the signed-in account has admin access. One lookup per user per page session; silent on failure. */
export function useIsAdmin(): boolean {
  const { isAuthenticated, getAccessTokenSilently, user } = useAuth();
  const sub = user?.sub ?? "anon";
  const [result, setResult] = useState<{ sub: string; admin: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    let lookup = cache.get(sub);
    if (!lookup) {
      lookup = getAccessTokenSilently()
        .then((token) => accountRequest(token, "GET"))
        .then((account) => account.admin === true)
        .catch(() => false);
      cache.set(sub, lookup);
    }
    let live = true;
    void lookup.then((admin) => live && setResult({ sub, admin }));
    return () => {
      live = false;
    };
  }, [isAuthenticated, getAccessTokenSilently, sub]);

  return isAuthenticated && result?.sub === sub && result.admin;
}
