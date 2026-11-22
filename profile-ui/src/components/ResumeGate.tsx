import { useEffect, useRef, useState } from "react";
import { z } from "@/lib/zod";
import { CheckCircle2, Info, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/auth/auth";
import { setToken } from "@/lib/otpSession";
import {
  OtpApiError,
  requestOtp,
  verifyOtp,
  type OtpChallenge,
} from "@/lib/resumeOtpApi";
import FormErrorSummary from "./FormErrorSummary";
import OtpInput from "./OtpInput";
import TurnstileWidget from "./TurnstileWidget";

const PRIVACY =
  "Your email is stored so the owner can see who viewed the resume, until the owner deletes it.";
const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address, like name@example.com.");

type Step = "choose" | "email" | "code" | "verified";
type Problem = { field: string; label: string; message: string };

const wait = (seconds?: number) => {
  if (!seconds) return "a little while";
  if (seconds <= 90) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
};

function sendProblem(error: unknown): Problem {
  const e = error instanceof OtpApiError ? error : undefined;
  const base = { field: "request", label: "Sending the code" };
  switch (e?.code) {
    case "invalid_request":
      return {
        field: "email",
        label: "Email address",
        message: "Enter a valid email address, like name@example.com.",
      };
    case "captcha_failed":
      return {
        ...base,
        message: "The verification check failed. Please try again.",
      };
    case "rate_limited":
      return {
        ...base,
        message: `Too many requests. Try again in ${wait(e.retryAfterSeconds)}, or sign in instead.`,
      };
    case "otp_unavailable":
      return {
        ...base,
        message:
          "Email verification is unavailable right now. Please sign in instead.",
      };
    case "send_failed":
      return {
        ...base,
        message:
          "We could not send the code. Try again shortly, or sign in instead.",
      };
    case "network":
      return {
        ...base,
        message:
          "We could not reach the server. Check your connection and try again.",
      };
    default:
      return { ...base, message: "Something went wrong. Please try again." };
  }
}

function verifyProblem(error: unknown): Problem {
  const e = error instanceof OtpApiError ? error : undefined;
  const base = { field: "code", label: "Verification code" };
  switch (e?.code) {
    case "invalid_code": {
      const left = e.attemptsRemaining;
      return {
        ...base,
        message:
          left === 0
            ? "That code is incorrect. Request a new code to try again."
            : left === undefined
              ? "That code is incorrect or has expired. Check it and try again."
              : `That code is incorrect or has expired. ${left} ${left === 1 ? "attempt" : "attempts"} left.`,
      };
    }
    case "locked":
      return {
        ...base,
        message: `Too many incorrect codes. Try again in ${wait(e.retryAfterSeconds)}, or sign in instead.`,
      };
    case "network":
      return {
        ...base,
        message:
          "We could not reach the server. Check your connection and try again.",
      };
    default:
      return { ...base, message: "Something went wrong. Please try again." };
  }
}

type Props = {
  onVerified: () => void;
  /** Shown above the gate, for example after an expired session. */
  notice?: string;
};

export default function ResumeGate({ onVerified, notice }: Props) {
  const { loginWithRedirect } = useAuth();
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [turnstile, setTurnstile] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [captchaLost, setCaptchaLost] = useState(false);
  const [codeKey, setCodeKey] = useState(0);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const signIn = () =>
    void loginWithRedirect({ appState: { returnTo: "/resume" } });

  const send = async (address: string) => {
    if (inFlight.current) return;
    if (!turnstile) return;
    inFlight.current = true;
    setBusy(true);
    setProblems([]);
    try {
      const next = await requestOtp(address, turnstile);
      setChallenge(next);
      setSecondsLeft(next.resendAfterSeconds);
      setStep("code");
      setCodeKey((k) => k + 1);
    } catch (error) {
      setProblems([sendProblem(error)]);
    } finally {
      // Turnstile tokens are single use: always ask for a new one.
      setTurnstile(null);
      setCaptchaLost(false);
      setCaptchaKey((k) => k + 1);
      inFlight.current = false;
      setBusy(false);
    }
  };

  const retryCaptcha = () => {
    setCaptchaLost(false);
    setTurnstile(null);
    setProblems([]);
    setCaptchaKey((k) => k + 1);
  };

  const onEmailSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!turnstile) {
      // Pending checks are explained by the status text; only a lost one is an error.
      if (captchaLost)
        setProblems([
          {
            field: "turnstile",
            label: "Verification check",
            message:
              "The verification check expired or failed. Retry the check, then send the code.",
          },
        ]);
      return;
    }
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setProblems([
        {
          field: "email",
          label: "Email address",
          message: parsed.error.issues[0].message,
        },
      ]);
      return;
    }
    setEmail(parsed.data);
    void send(parsed.data);
  };

  const onCode = async (code: string) => {
    if (inFlight.current || !challenge) return;
    inFlight.current = true;
    setBusy(true);
    setProblems([]);
    try {
      const access = await verifyOtp(challenge.challengeId, code);
      setToken(access.accessToken, access.expiresInSeconds);
      setStep("verified");
      onVerified();
    } catch (error) {
      setProblems([verifyProblem(error)]);
      setCodeKey((k) => k + 1);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const editEmail = () => {
    setChallenge(null);
    setProblems([]);
    setTurnstile(null);
    setStep("email");
  };

  const emailProblem = problems.find((p) => p.field === "email");
  const codeProblem = problems.find((p) => p.field === "code");
  const captcha = (
    <>
      <TurnstileWidget
        resetKey={captchaKey}
        onToken={(token) => {
          setCaptchaLost(false);
          setTurnstile(token);
        }}
        onExpire={() => {
          setTurnstile(null);
          setCaptchaLost(true);
        }}
      />
      <div aria-live="polite" className="otp-live otp-live--visible">
        {!turnstile &&
          (captchaLost ? (
            <>
              <span>The verification check expired or failed.</span>
              <button
                type="button"
                className="link-button"
                onClick={retryCaptcha}
              >
                Retry check
              </button>
            </>
          ) : (
            <>
              <Loader2
                className="resume-spinner"
                size={16}
                aria-hidden="true"
              />
              <span>Checking that you&apos;re human…</span>
            </>
          ))}
      </div>
    </>
  );
  const authButton = (
    <button type="button" className="link-button" onClick={signIn}>
      Sign in with Auth0
    </button>
  );

  return (
    <section className="page-panel otp-gate" aria-labelledby="otp-gate-title">
      {notice && (
        <p role="status" className="page-notice page-notice--warning">
          <Info size={20} aria-hidden="true" />
          <span>{notice}</span>
        </p>
      )}
      {problems.length > 0 && (
        <div className="otp-summary">
          <FormErrorSummary errors={problems} />
        </div>
      )}

      {step === "choose" && (
        <>
          <h2 id="otp-gate-title" className="panel-title">
            <ShieldCheck size={22} aria-hidden="true" />
            View the resume
          </h2>
          <p className="page-copy">
            Confirm your email with a one-time code, or sign in with Auth0.
          </p>
          <p className="field-hint">{PRIVACY}</p>
          <div className="page-actions otp-actions">
            <button
              type="button"
              className="studio-button"
              onClick={() => setStep("email")}
            >
              <Mail size={18} aria-hidden="true" />
              Verify with email
            </button>
            <button
              type="button"
              className="studio-button-secondary"
              onClick={signIn}
            >
              Sign in with Auth0
            </button>
          </div>
        </>
      )}

      {step === "email" && (
        <form noValidate onSubmit={onEmailSubmit} aria-busy={busy}>
          <h2 id="otp-gate-title" className="panel-title">
            <Mail size={22} aria-hidden="true" />
            Verify your email
          </h2>
          <div className="field">
            <label className="field-label" htmlFor="otp-email">
              Email address
            </label>
            <input
              id="otp-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              autoFocus
              className="field-input"
              value={email}
              disabled={busy}
              aria-invalid={emailProblem ? true : undefined}
              aria-describedby={
                emailProblem ? "otp-email-hint" : "otp-email-hint"
              }
              onChange={(e) => setEmail(e.target.value)}
            />
            {emailProblem && (
              <p id="otp-email-error" className="field-error">
                {emailProblem.message}
              </p>
            )}
            <p id="otp-email-hint" className="field-hint">
              We will email you a 6-digit code. {PRIVACY}
            </p>
          </div>
          {captcha}
          <div className="page-actions otp-actions">
            <button
              type="submit"
              className="studio-button"
              aria-disabled={busy || !turnstile}
            >
              {busy ? (
                <Loader2
                  className="resume-spinner"
                  size={18}
                  aria-hidden="true"
                />
              ) : null}
              Send code
            </button>
            {authButton}
          </div>
          <p role="status" className="otp-live">
            {busy ? "Sending your code…" : ""}
          </p>
        </form>
      )}

      {step === "code" && (
        <div aria-busy={busy}>
          <h2 id="otp-gate-title" className="panel-title">
            <Mail size={22} aria-hidden="true" />
            Enter your code
          </h2>
          <p role="status" className="otp-live otp-live--visible">
            {busy
              ? "Verifying…"
              : `We sent a 6-digit code to ${email}. It expires in ${Math.round((challenge?.expiresInSeconds ?? 600) / 60)} minutes.`}
          </p>
          <OtpInput
            legend="Verification code"
            autoFocus
            disabled={busy}
            invalid={Boolean(codeProblem)}
            describedBy={
              codeProblem ? "otp-code-error otp-code-hint" : "otp-code-hint"
            }
            resetKey={codeKey}
            focusOnReset={false}
            onComplete={(code) => void onCode(code)}
          />
          {codeProblem && (
            <p id="otp-code-error" className="field-error">
              {codeProblem.message}
            </p>
          )}
          <p id="otp-code-hint" className="field-hint">
            Check your spam folder if it does not arrive. {PRIVACY}
          </p>
          {captcha}
          <div className="page-actions otp-actions">
            <button
              type="button"
              className="studio-button-secondary"
              disabled={busy || secondsLeft > 0 || !turnstile}
              onClick={() => void send(email)}
            >
              {secondsLeft > 0 ? (
                <>
                  Resend code in{" "}
                  <span className="otp-count">{secondsLeft}s</span>
                </>
              ) : (
                "Resend code"
              )}
            </button>
            <button type="button" className="link-button" onClick={editEmail}>
              Wrong email? Edit
            </button>
            {authButton}
          </div>
        </div>
      )}

      {step === "verified" && (
        <p role="status" className="otp-live otp-live--visible">
          <CheckCircle2 size={20} aria-hidden="true" />
          Verified. Loading your resume…
        </p>
      )}
    </section>
  );
}
