import { useEffect, useRef, useState } from "react";

const SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      "timeout-callback": () => void;
    },
  ) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
const api = (): TurnstileApi | undefined =>
  (window as unknown as { turnstile?: TurnstileApi }).turnstile;

let loading: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
  if (loading) return loading;
  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const loaded = api();
      if (loaded) resolve(loaded);
      else reject(new Error("turnstile missing"));
    };
    script.onerror = () => reject(new Error("turnstile blocked"));
    document.head.append(script);
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

export function __resetTurnstileForTests() {
  loading = null;
}

type Props = {
  onToken: (token: string) => void;
  onExpire: () => void;
  /** Change to request a fresh challenge (tokens are single use). */
  resetKey?: number;
  siteKey?: string;
};

export default function TurnstileWidget({
  onToken,
  onExpire,
  resetKey = 0,
  siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "",
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const widget = useRef<{ id: string; api: TurnstileApi } | null>(null);
  const handlers = useRef({ onToken, onExpire });
  const [state, setState] = useState<"loading" | "ready" | "failed">(
    siteKey ? "loading" : "failed",
  );
  useEffect(() => {
    handlers.current = { onToken, onExpire };
  });

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    const fail = () => {
      setState("failed");
      handlers.current.onExpire();
    };
    loadScript().then(
      (turnstile) => {
        if (cancelled || !host.current) return;
        const id = turnstile.render(host.current, {
          sitekey: siteKey,
          action: "resume_otp",
          callback: (token) => handlers.current.onToken(token),
          "expired-callback": () => handlers.current.onExpire(),
          "error-callback": fail,
          "timeout-callback": () => handlers.current.onExpire(),
        });
        widget.current = { id, api: turnstile };
        setState("ready");
      },
      () => {
        if (!cancelled) fail();
      },
    );
    return () => {
      cancelled = true;
      if (widget.current) {
        try {
          widget.current.api.remove(widget.current.id);
        } catch {
          /* widget already gone */
        }
        widget.current = null;
      }
    };
  }, [siteKey]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (widget.current) widget.current.api.reset(widget.current.id);
  }, [resetKey]);

  return (
    <div className="turnstile">
      <div ref={host} className="turnstile-host" />
      {state !== "ready" && (
        <p role="status" className="field-hint">
          {state === "loading"
            ? "Loading verification…"
            : siteKey
              ? "The verification check could not load. Check your connection, disable blockers for this site and reload, or sign in instead."
              : "Email verification is unavailable right now. Please sign in instead."}
        </p>
      )}
    </div>
  );
}
