import { Helmet } from "react-helmet-async";
import { useAuth0 } from "@auth0/auth0-react";
import { useTheme } from "@/theme/ThemeContext";
import { DocumentArrowDownIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";

const ResumePage = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { colors } = useTheme();
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
        objectUrl = URL.createObjectURL(pdf);
        setPdfUrl(objectUrl);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
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
      <main
        className="min-h-dvh px-4 py-24"
        style={{ backgroundColor: colors.background }}
      >
        <div className="max-w-4xl mx-auto">
          <h1
            className="text-4xl md:text-5xl font-bold"
            style={{ color: colors.primary }}
          >
            Resume
          </h1>
          <p className="mt-4 mb-8" style={{ color: colors.textSecondary }}>
            Explore my experience, technical skills, and professional
            background.
          </p>
          {error ? (
            <div
              role="alert"
              className="rounded-lg border p-6"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <p>{error}</p>
              <button
                className="mt-4 underline font-semibold"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          ) : !pdfUrl ? (
            <p role="status" style={{ color: colors.textSecondary }}>
              Loading your secure resume preview…
            </p>
          ) : (
            <>
              <a
                href={pdfUrl}
                download="Sravana_Parimi_Resume.pdf"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold mb-6"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.accent,
                }}
              >
                <DocumentArrowDownIcon className="w-5 h-5" aria-hidden="true" />{" "}
                Download resume
              </a>
              <p
                className="mb-4 text-sm"
                style={{ color: colors.textSecondary }}
              >
                If your browser cannot display the preview, download the PDF
                above.
              </p>
              <iframe
                src={pdfUrl}
                title="Resume PDF"
                className="w-full rounded-lg border-0 h-[70dvh] min-h-[420px]"
                style={{ backgroundColor: colors.surface }}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default ResumePage;
