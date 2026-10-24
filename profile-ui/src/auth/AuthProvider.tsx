import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import {
  AuthContext,
  hasAuthHint,
  setAuthHint,
  type AuthContextValue,
  type AuthMethods,
  type AuthSnapshot,
} from "./auth";

const LazyAuth0Bridge = lazy(() => import("./Auth0Bridge"));

/** Routes that cannot render without the SDK. */
const AUTH_ROUTES = /^\/(auth-callback|resume|account|admin)(\/|$)/;

type Job = (methods: AuthMethods) => void;

/**
 * Eager and SDK-free. Children are never remounted: the Auth0 provider lives
 * in a sibling subtree that mounts on demand and reports state back here.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const needsAuthRoute = AUTH_ROUTES.test(pathname);
  const [active, setActive] = useState(() => needsAuthRoute || hasAuthHint());
  const [snapshot, setSnapshot] = useState<AuthSnapshot | null>(null);
  const methodsRef = useRef<AuthMethods | null>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<Job[]>([]);

  useEffect(() => {
    if (needsAuthRoute) setActive(true);
  }, [needsAuthRoute]);

  const handleChange = useCallback(
    (next: AuthSnapshot, methods: AuthMethods) => {
      methodsRef.current = methods;
      readyRef.current = !next.isLoading;
      setSnapshot(next);
      if (next.isLoading) return;
      setAuthHint(next.isAuthenticated);
      const jobs = queueRef.current.splice(0);
      jobs.forEach((job) => job(methods));
    },
    [],
  );

  const run = useCallback(
    <T,>(call: (methods: AuthMethods) => Promise<T>) =>
      new Promise<T>((resolve, reject) => {
        const job: Job = (methods) => call(methods).then(resolve, reject);
        if (readyRef.current && methodsRef.current) {
          job(methodsRef.current);
        } else {
          queueRef.current.push(job);
          setActive(true);
        }
      }),
    [],
  );

  const loginWithRedirect = useCallback<AuthMethods["loginWithRedirect"]>(
    (options) => run((m) => m.loginWithRedirect(options)),
    [run],
  );
  const logout = useCallback<AuthMethods["logout"]>(
    (options) => {
      setAuthHint(false);
      return run((m) => m.logout(options));
    },
    [run],
  );
  const getAccessTokenSilently = useCallback<
    AuthMethods["getAccessTokenSilently"]
  >((options) => run((m) => m.getAccessTokenSilently(options)), [run]);

  const waiting = (active || needsAuthRoute) && snapshot === null;
  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: waiting || (snapshot?.isLoading ?? false),
      isAuthenticated: snapshot?.isAuthenticated ?? false,
      user: snapshot?.user,
      error: snapshot?.error,
      loginWithRedirect,
      logout,
      getAccessTokenSilently,
    }),
    [waiting, snapshot, loginWithRedirect, logout, getAccessTokenSilently],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        {active && <LazyAuth0Bridge onChange={handleChange} />}
      </Suspense>
    </AuthContext.Provider>
  );
}
