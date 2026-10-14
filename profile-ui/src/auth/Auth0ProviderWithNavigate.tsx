import {
  Auth0Provider,
  Auth0Context,
  initialContext,
  type AppState,
} from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import AccountSessionBootstrap from "./AccountSessionBootstrap";

type Props = {
  children: React.ReactNode;
};

const Auth0ProviderWithNavigate = ({ children }: Props) => {
  const navigate = useNavigate();
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const redirectUri =
    import.meta.env.VITE_AUTH0_CALLBACK_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");
  const authAudience = import.meta.env.VITE_AUTH0_AUDIENCE;

  if (!domain || !clientId || !redirectUri || !authAudience) {
    const unconfiguredContext = {
      ...initialContext,
      isLoading: false,
      isAuthenticated: false,
      error: new Error("Authentication is not configured."),
      loginWithRedirect: async () => {
        navigate("/resume");
      },
      getAccessTokenSilently: async () => {
        throw new Error("Authentication is not configured.");
      },
    };

    return (
      <Auth0Context.Provider value={unconfiguredContext}>
        {children}
      </Auth0Context.Provider>
    );
  }
  const onRedirectCallback = (state?: AppState) => {
    const target = state?.returnTo || "/";
    const targetPath = target.split("?")[0].split("#")[0];
    const allowed = [
      "/",
      "/resume",
      "/work",
      "/about",
      "/contact",
      "/privacy",
      "/termsconditions",
      "/account",
      "/admin",
      "/admin/inquiries",
    ];
    const destination = allowed.includes(targetPath) ? target : "/";
    navigate(destination, {
      replace: true,
    });
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      useRefreshTokens={true}
      cacheLocation="localstorage"
      authorizationParams={{
        audience: authAudience,
        redirect_uri: redirectUri,
        scope: "openid profile email offline_access",
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
      <AccountSessionBootstrap />
    </Auth0Provider>
  );
};

export default Auth0ProviderWithNavigate;
