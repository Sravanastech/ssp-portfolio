import { Helmet } from "react-helmet-async";
import { useAuth } from "@/auth/auth";
import { AlertCircle, Download, ExternalLink, Loader2 } from "lucide-react";
import "@/styles/pages.css";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

const ResumePage = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setPdfUrl(null);
    setError("");
    async function loadResume() {
      try {
        const token = await getAccessTokenSilently();
        if (controller.signal.aborted) return;
        const response = await fetch("/api/resume", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
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
        objectUrl = URL.createObjectURL(pdf);
        setPdfUrl(objectUrl);
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
  }, [getAccessTokenSilently, isAuthenticated, attempt]);

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
          {error ? (
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
          ) : !pdfUrl ? (
            <div className="resume-loading" aria-busy="true">
              <p role="status" className="resume-status">
                <Loader2
                  className="resume-spinner"
                  size={18}
                  aria-hidden="true"
                />
                Loading your secure resume preview…
              </p>
              <span
                className="skeleton-bar skeleton-bar--frame"
                aria-hidden="true"
              />
            </div>
          ) : (
            <>
              <div className="resume-actions">
                <a
                  href={pdfUrl}
                  download="Sravana_Parimi_Resume.pdf"
                  className="studio-button"
                >
                  <Download size={18} aria-hidden="true" />
                  Download resume
                </a>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="studio-button-secondary"
                >
                  <ExternalLink size={18} aria-hidden="true" />
                  Open in new tab
                </a>
              </div>
              <p className="resume-note">
                Phone browsers rarely display PDFs inline. Open the resume in a
                new tab or download it to read it.
              </p>
              <iframe
                src={pdfUrl}
                title="Resume PDF"
                className="resume-frame"
              />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ResumePage;
