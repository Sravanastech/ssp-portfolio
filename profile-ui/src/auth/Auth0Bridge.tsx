import { useEffect } from "react";
import { Auth0Provider, useAuth0, type AppState } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import AccountSessionBootstrap from "./AccountSessionBootstrap";
import type { AuthMethods, AuthSnapshot } from "./auth";

type Props = {
  onChange: (snapshot: AuthSnapshot, methods: AuthMethods) => void;
};

const ALLOWED_RETURN_PATHS = [
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

function Reporter({ onChange }: Props) {
  const auth = useAuth0();
  const { isLoading, isAuthenticated, user, error } = auth;
  const { loginWithRedirect, logout, getAccessTokenSilently } = auth;
  useEffect(() => {
    onChange(
      { isLoading, isAuthenticated, user, error },
      {
        loginWithRedirect,
        logout,
        getAccessTokenSilently:
          getAccessTokenSilently as AuthMethods["getAccessTokenSilently"],
      },
    );
  }, [
    onChange,
    isLoading,
    isAuthenticated,
    user,
    error,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  ]);
  return <AccountSessionBootstrap />;
}

function Unconfigured({ onChange }: Props) {
  const navigate = useNavigate();
  useEffect(() => {
    onChange(
      {
        isLoading: false,
        isAuthenticated: false,
        user: undefined,
        error: new Error("Authentication is not configured."),
      },
      {
        loginWithRedirect: async () => {
          navigate("/resume");
        },
        logout: async () => undefined,
        getAccessTokenSilently: async () => {
          throw new Error("Authentication is not configured.");
        },
      },
    );
  }, [onChange, navigate]);
  return null;
}

/** Lazy-loaded: the only module (with Reporter) that imports the Auth0 SDK. */
export default function Auth0Bridge({ onChange }: Props) {
  const navigate = useNavigate();
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const redirectUri =
    import.meta.env.VITE_AUTH0_CALLBACK_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5173");
  const authAudience = import.meta.env.VITE_AUTH0_AUDIENCE;

  if (!domain || !clientId || !redirectUri || !authAudience) {
    return <Unconfigured onChange={onChange} />;
  }

  const onRedirectCallback = (state?: AppState) => {
    const target = state?.returnTo || "/";
    const targetPath = target.split("?")[0].split("#")[0];
    navigate(ALLOWED_RETURN_PATHS.includes(targetPath) ? target : "/", {
      replace: true,
    });
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      cacheLocation="memory"
      useRefreshTokens
      useRefreshTokensFallback
      authorizationParams={{
        audience: authAudience,
        redirect_uri: redirectUri,
        scope: "openid profile email offline_access",
      }}
      onRedirectCallback={onRedirectCallback}
    >
      <Reporter onChange={onChange} />
    </Auth0Provider>
  );
}
