import { Helmet } from "react-helmet-async";
import { useAuth } from "@/auth/auth";
import { AlertCircle, Download, ExternalLink, Loader2 } from "lucide-react";
import "@/styles/pages.css";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { warmBackend } from "@/lib/backendWarmup";
import { loadPdfRenderer } from "@/lib/pdfLoader";
import { clear as clearOtp, getToken as getOtpToken } from "@/lib/otpSession";
import ResumeGate from "@/components/ResumeGate";

const SLOW_AFTER_MS = 2500;
const RENDER_ERROR =
  "The resume preview could not be drawn. Download the file or try again.";

type Loaded = { url: string; data: Uint8Array };

function PdfPreview({
  data,
  onReady,
  onError,
}: {
  data: Uint8Array;
  onReady: () => void;
  onError: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onError });
  useEffect(() => {
    callbacks.current = { onReady, onError };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let handle: { destroy: () => void } | undefined;
    loadPdfRenderer()
      .then(({ renderPdf }) => {
        if (cancelled) return;
        handle = renderPdf({
          host,
          data,
          onFirstPage: () => callbacks.current.onReady(),
          onError: () => callbacks.current.onError(RENDER_ERROR),
        });
      })
      .catch(() => {
        if (!cancelled) callbacks.current.onError(RENDER_ERROR);
      });
    return () => {
      cancelled = true;
      handle?.destroy();
    };
  }, [data]);

  return <div ref={hostRef} className="resume-pages" />;
}

const ResumePage = () => {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [otpToken, setOtpToken] = useState<string | null>(() => getOtpToken());
  const [expired, setExpired] = useState(false);
  const hasCredential = isAuthenticated || otpToken !== null;

  // Resume intent is certain here: warm the API and pdf.js before the token resolves.
  useEffect(() => {
    warmBackend();
  }, []);
  const authPending = isLoading || hasCredential;
  useEffect(() => {
    if (authPending) void loadPdfRenderer().catch(() => undefined);
  }, [authPending]);

  useEffect(() => {
    if (!hasCredential) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setLoaded(null);
    setDrawn(false);
    setError("");
    async function loadResume() {
      try {
        // Auth0 wins when present; otherwise use the email-code token.
        const token = isAuthenticated
          ? await getAccessTokenSilently()
          : (otpToken ?? "");
        if (controller.signal.aborted) return;
        const response = await fetch("/api/resume", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401 && !isAuthenticated) {
          clearOtp();
          setOtpToken(null);
          setExpired(true);
          return;
        }
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Your session could not be verified. Please sign in again."
              : response.status === 503
                ? "The resume is unavailable right now. Please try again in a few minutes."
                : "The resume is temporarily unavailable. Please try again.",
          );
        if (
          !response.headers.get("content-type")?.includes("application/pdf")
        ) {
          throw new Error(
            "The resume service is unavailable. Please try again later.",
          );
        }
        const pdf = await response.blob();
        if (controller.signal.aborted) return;
        if (pdf.size === 0) {
          throw new Error("The resume file came back empty. Please try again.");
        }
        const data = new Uint8Array(await pdf.arrayBuffer());
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(pdf);
        setLoaded({ url: objectUrl, data });
        trackEvent("resume_view");
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof TypeError
              ? "The resume service could not be reached. Check your connection and try again."
              : cause instanceof Error
                ? cause.message
                : "Unable to load the resume.",
          );
        }
      }
    }
    void loadResume();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    getAccessTokenSilently,
    isAuthenticated,
    hasCredential,
    otpToken,
    attempt,
  ]);

  const waiting = !error && !drawn;
  useEffect(() => {
    setSlow(false);
    if (!waiting) return;
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [waiting, attempt]);

  return (
    <>
      <Helmet>
        <title>Resume | Sravana S Parimi</title>
        <meta
          name="description"
          content="View and download Sravana S Parimi’s professional resume."
        />
        <meta name="robots" content="noindex, noarchive" />
      </Helmet>
      <div className="studio-page resume-page">
        <div className="studio-container">
          <header className="studio-page-intro">
            <h1 className="studio-page-heading">Resume</h1>
            <p className="studio-lede">
              Experience, technical skills, and professional background.
            </p>
          </header>
          {!hasCredential && !isLoading ? (
            <ResumeGate
              notice={
                expired
                  ? "Your session expired. Verify your email again to keep viewing the resume."
                  : undefined
              }
              onVerified={() => {
                setExpired(false);
                setOtpToken(getOtpToken());
              }}
            />
          ) : error ? (
            <div role="alert" className="resume-panel resume-panel--error">
              <AlertCircle size={22} aria-hidden="true" />
              <div>
                <p>{error}</p>
                <button
                  type="button"
                  className="studio-button"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <>
              {loaded && (
                <div className="resume-actions">
                  <a
                    href={loaded.url}
                    download="Sravana_Parimi_Resume.pdf"
                    className="studio-button"
                  >
                    <Download size={18} aria-hidden="true" />
                    Download resume
                  </a>
                  <a
                    href={loaded.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="studio-button-secondary"
                  >
                    <ExternalLink size={18} aria-hidden="true" />
                    Open in new tab
                  </a>
                </div>
              )}
              {!drawn && (
                <div className="resume-loading" aria-busy="true">
                  <p
                    role="status"
                    className={`resume-status${slow ? " resume-status--slow" : ""}`}
                  >
                    <Loader2
                      className="resume-spinner"
                      size={18}
                      aria-hidden="true"
                    />
                    {slow
                      ? "Waking up the server… first view can take a few seconds"
                      : "Loading your secure resume preview…"}
                  </p>
                  <span
                    className="skeleton-bar skeleton-bar--frame"
                    aria-hidden="true"
                  />
                </div>
              )}
              {loaded && (
                <figure
                  className="resume-preview"
                  aria-label="Resume preview. The Download resume link is the accessible alternative."
                  data-ready={drawn}
                >
                  <PdfPreview
                    data={loaded.data}
                    onReady={() => setDrawn(true)}
                    onError={setError}
                  />
                </figure>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ResumePage;
