import { SiteText } from "@/content/SiteContent";
import { useSiteContent } from "@/content/SiteContent";
import { useState, useEffect } from "react";
import ContactForm, { ContactFormData } from "@/components/ContactForm";
import { useSubmitContactInquiry } from "@/api/ContactApi";
import { CheckCircle2, AlertTriangle, CloudOff } from "lucide-react";
import { useTheme } from "@/theme/ThemeContext";
import { reportEvent } from "@/lib/monitoring";
import {
  saveOfflineDraft,
  getPendingDrafts,
  deleteOfflineDraft,
  type QueuedContactDraft,
} from "@/lib/offlineDrafts";

const SuccessBanner = ({
  submittedData,
  isOfflineQueued = false,
  onReset,
}: {
  submittedData: ContactFormData | null;
  isOfflineQueued?: boolean;
  onReset: () => void;
}) => {
  const { colors } = useTheme();

  return (
    <div
      role="status"
      className="p-6 md:p-10 w-full space-y-6 rounded-xl border shadow-xs"
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      <div className="flex justify-center" style={{ color: colors.success }}>
        <CheckCircle2 size={56} />
      </div>
      <div className="space-y-2 text-center">
        <h2
          className="text-2xl md:text-3xl font-semibold tracking-tight"
          style={{ color: colors.primary }}
        >
          {isOfflineQueued
            ? `Thanks, ${submittedData?.name || ""}. Draft saved locally.`
            : (
              <>
                <SiteText id="pages.ContactPage.text.1" />
                {submittedData?.name}
                <SiteText id="pages.ContactPage.text.2" />
              </>
            )}
        </h2>
        <p
          className="text-base leading-relaxed"
          style={{ color: colors.textSecondary }}
        >
          {isOfflineQueued ? (
            "Your message is saved on this device only. Use the Retry button to send it when you're back online. Clearing browser data will remove saved drafts."
          ) : (
            <>
              <SiteText id="pages.ContactPage.text.3" />{" "}
              <span className="font-bold" style={{ color: colors.text }}>
                {submittedData?.email || submittedData?.phone}
              </span>
              <SiteText id="pages.ContactPage.text.4" />
            </>
          )}
        </p>
      </div>

      <div
        className="p-4 rounded-lg border text-left text-sm space-y-2"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
          color: colors.text,
        }}
      >
        <p>
          <strong>
            <SiteText id="pages.ContactPage.text.5" />
          </strong>{" "}
          {submittedData?.email || submittedData?.phone}
        </p>
        {submittedData?.message && (
          <p className="line-clamp-3">
            <strong>
              <SiteText id="pages.ContactPage.text.6" />
            </strong>
            <SiteText id="pages.ContactPage.text.7" />
            {submittedData.message}
            <SiteText id="pages.ContactPage.text.8" />
          </p>
        )}
      </div>

      <div className="pt-2 flex flex-col items-center gap-3">
        <button
          onClick={onReset}
          className="studio-button w-full h-12 rounded-lg font-semibold flex items-center justify-center transition-all"
          style={{
            backgroundColor: colors.primary,
            color: colors.accent,
          }}
        >
          <SiteText id="pages.ContactPage.text.9" />
        </button>
      </div>
    </div>
  );
};

const ContactPage = () => {
  const { profile } = useSiteContent();
  const { colors } = useTheme();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isOfflineQueued, setIsOfflineQueued] = useState(false);
  const [submittedData, setSubmittedData] = useState<ContactFormData | null>(
    null,
  );
  const [lastAttemptedData, setLastAttemptedData] =
    useState<ContactFormData | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<QueuedContactDraft[]>([]);
  const [draftError, setDraftError] = useState<string | null>(null);

  const { submitInquiry, isPending, isError, error, reset } =
    useSubmitContactInquiry();

  useEffect(() => {
    void getPendingDrafts().then(setPendingDrafts);
  }, []);

  const handleSubmit = async (data: ContactFormData) => {
    setLastAttemptedData(data);
    try {
      await submitInquiry(data);
      reportEvent("contact_success");
      setSubmittedData(data);
      setIsOfflineQueued(false);
      setIsSubmitted(true);
      // Clean up any matching pending draft in storage
      const matching = pendingDrafts.find(
        (d) => d.name === data.name && d.message === data.message,
      );
      if (matching) {
        await deleteOfflineDraft(matching.id);
        setPendingDrafts((prev) => prev.filter((d) => d.id !== matching.id));
      }
    } catch {
      reportEvent("contact_failure");
    }
  };

  const handleSaveOffline = async () => {
    if (!lastAttemptedData) return;
    try {
      const saved = await saveOfflineDraft(lastAttemptedData);
      setPendingDrafts((prev) => [saved, ...prev]);
      setSubmittedData(lastAttemptedData);
      setIsOfflineQueued(true);
      setIsSubmitted(true);
    } catch (err: unknown) {
      setDraftError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRetryPendingDraft = async (draft: QueuedContactDraft) => {
    try {
      await submitInquiry({
        name: draft.name,
        email: draft.email || "",
        phone: draft.phone || "",
        message: draft.message,
      });
      await deleteOfflineDraft(draft.id);
      setPendingDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      setSubmittedData({
        name: draft.name,
        email: draft.email || "",
        phone: draft.phone || "",
        message: draft.message,
      });
      setIsOfflineQueued(false);
      setIsSubmitted(true);
    } catch (err: unknown) {
      setDraftError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDiscardDraft = async (id: string) => {
    await deleteOfflineDraft(id);
    setPendingDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <>
      <div
        className="studio-page"
        style={{ backgroundColor: colors.background, color: colors.text }}
      >
        <div className="studio-container">
          <header className="studio-page-intro">
            <h1 className="studio-page-heading">
              <SiteText id="pages.ContactPage.text.11" />
              <br />
              <SiteText id="pages.ContactPage.text.12" />
            </h1>
          </header>
          <div
            className="studio-contact studio-section border-t"
            style={{ borderColor: colors.border }}
          >
            <aside>
              <h2 className="text-3xl font-semibold mb-5">
                <SiteText id="pages.ContactPage.text.13" />
              </h2>
              <p className="studio-lede">
                <SiteText id="pages.ContactPage.text.14" />
              </p>
              <div className="mt-10 space-y-7">
                <div>
                  <p
                    className="text-sm mb-2"
                    style={{ color: colors.textSecondary }}
                  >
                    <SiteText id="pages.ContactPage.text.15" />
                  </p>
                  <a
                    className="studio-link break-all"
                    href={`mailto:${profile.email}`}
                  >
                    {profile.email}
                  </a>
                </div>
                <div>
                  <p
                    className="text-sm mb-2"
                    style={{ color: colors.textSecondary }}
                  >
                    <SiteText id="pages.ContactPage.text.16" />
                  </p>
                  <a
                    className="studio-link"
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SiteText id="pages.ContactPage.text.17" />
                  </a>
                </div>
                <p style={{ color: colors.textSecondary }}>
                  {profile.location}
                </p>
              </div>
            </aside>
            <div className="min-w-0 space-y-6">
              {pendingDrafts.length > 0 && !isSubmitted && (
                <div
                  className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-xs"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <CloudOff className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-xs sm:text-sm">
                        {pendingDrafts.length} offline draft
                        {pendingDrafts.length > 1 ? "s" : ""} saved locally.
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: colors.textSecondary }}
                      >
                        Personal details stored on your device only.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleRetryPendingDraft(pendingDrafts[0])}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.accent,
                      }}
                    >
                      Retry Send
                    </button>
                    <button
                      onClick={() => handleDiscardDraft(pendingDrafts[0].id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                      style={{
                        borderColor: colors.border,
                        color: colors.textSecondary,
                      }}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}

              {isError && (
                <div
                  role="alert"
                  className="flex flex-col gap-3 p-4 border rounded-lg text-sm font-medium w-full max-w-4xl mx-auto"
                  style={{
                    borderColor: colors.error,
                    backgroundColor: `${colors.error}20`,
                    color: colors.error,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="shrink-0" size={20} />
                    <span>
                      {error?.message ||
                        "Something went wrong. Please try again later."}
                    </span>
                  </div>
                  {lastAttemptedData && (
                    <div
                      className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-normal"
                      style={{ borderColor: `${colors.error}40` }}
                    >
                      <span style={{ color: colors.text }}>
                        Save draft locally to send when you are back online?
                      </span>
                      <button
                        onClick={handleSaveOffline}
                        className="self-start sm:self-auto px-3 py-1.5 rounded-md font-semibold border"
                        style={{
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.primary,
                        }}
                      >
                        Save to send when online
                      </button>
                    </div>
                  )}
                </div>
              )}

              {draftError && (
                <div
                  role="alert"
                  className="flex flex-col gap-3 p-4 border rounded-lg text-sm font-medium w-full max-w-4xl mx-auto"
                  style={{
                    borderColor: colors.error,
                    backgroundColor: `${colors.error}20`,
                    color: colors.error,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="shrink-0" size={20} />
                    <span>{draftError}</span>
                  </div>
                </div>
              )}

              {!isSubmitted ? (
                <ContactForm onSubmit={handleSubmit} isLoading={isPending} />
              ) : (
                <SuccessBanner
                  submittedData={submittedData}
                  isOfflineQueued={isOfflineQueued}
                  onReset={() => {
                    setIsSubmitted(false);
                    setSubmittedData(null);
                    setLastAttemptedData(null);
                    setIsOfflineQueued(false);
                    reset();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;
