import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { accountRequest } from "@/api/accountApi";

/** Provision the app-owned profile as soon as Auth0 finishes signing in. */
export default function AccountSessionBootstrap() {
  const { isLoading, isAuthenticated, getAccessTokenSilently, user } =
    useAuth0();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    void getAccessTokenSilently()
      .then((token) =>
        accountRequest(token, "POST", {
          firstName: user?.given_name ?? "",
          lastName: user?.family_name ?? "",
        }),
      )
      .catch(() => {
        // The account page retries provisioning and presents a useful error if the API is unavailable.
      });
  }, [
    getAccessTokenSilently,
    isAuthenticated,
    isLoading,
    user?.family_name,
    user?.given_name,
  ]);

  return null;
}
