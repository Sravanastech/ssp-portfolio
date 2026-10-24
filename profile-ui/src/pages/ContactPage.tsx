import { SiteText } from "@/content/SiteContent";
import { useSiteContent } from "@/content/siteContentContext";
import { useState, useEffect } from "react";
import ContactForm, { ContactFormData } from "@/components/ContactForm";
import { useSubmitContactInquiry } from "@/api/ContactApi";
import { CheckCircle2, AlertTriangle, CloudOff } from "lucide-react";
import { reportEvent } from "@/lib/monitoring";
import { trackEvent } from "@/lib/analytics";
import "@/styles/pages.css";
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
  return (
    <div role="status" className="page-panel contact-success">
      <CheckCircle2 size={40} aria-hidden="true" />
      <div>
        <h2>
          {isOfflineQueued ? (
            `Thanks, ${submittedData?.name || ""}. Draft saved locally.`
          ) : (
            <>
              <SiteText id="pages.ContactPage.text.1" />
              {submittedData?.name}
              <SiteText id="pages.ContactPage.text.2" />
            </>
          )}
        </h2>
        <p className="page-copy">
          {isOfflineQueued ? (
            "Your message is saved on this device only. Use the Retry button to send it when you're back online. Clearing browser data will remove saved drafts."
          ) : (
            <>
              <SiteText id="pages.ContactPage.text.3" />{" "}
              <strong>{submittedData?.email || submittedData?.phone}</strong>
              <SiteText id="pages.ContactPage.text.4" />
            </>
          )}
        </p>
      </div>

      <div className="contact-recap">
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

      <button onClick={onReset} className="studio-button">
        <SiteText id="pages.ContactPage.text.9" />
      </button>
    </div>
  );
};

const ContactPage = () => {
  const { profile } = useSiteContent();
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
      trackEvent("contact_submit", { method: "web3forms" });
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
    <div className="studio-page">
      <div className="studio-container">
        <header className="studio-page-intro">
          <h1 className="studio-page-heading">
            <SiteText id="pages.ContactPage.text.11" />
            <br />
            <SiteText id="pages.ContactPage.text.12" />
          </h1>
        </header>
        <div className="studio-contact studio-section studio-rule">
          <aside className="contact-aside">
            <p className="studio-lede">
              <SiteText id="pages.ContactPage.text.14" />
            </p>
            <dl className="contact-methods">
              <div>
                <dt>
                  <SiteText id="pages.ContactPage.text.15" />
                </dt>
                <dd>
                  <a className="studio-link" href={`mailto:${profile.email}`}>
                    {profile.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt>
                  <SiteText id="pages.ContactPage.text.16" />
                </dt>
                <dd>
                  <a
                    className="studio-link"
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SiteText id="pages.ContactPage.text.17" />
                  </a>
                </dd>
              </div>
              <div>
                <dd className="page-small">{profile.location}</dd>
              </div>
            </dl>
          </aside>
          <div className="contact-main">
            {pendingDrafts.length > 0 && !isSubmitted && (
              <div className="page-notice page-notice--warning">
                <CloudOff size={20} aria-hidden="true" />
                <div className="notice-body">
                  <div>
                    <strong>
                      {pendingDrafts.length} offline draft
                      {pendingDrafts.length > 1 ? "s" : ""} saved locally.
                    </strong>
                    <p className="page-small">
                      Personal details stored on your device only.
                    </p>
                  </div>
                  <div className="notice-actions">
                    <button
                      onClick={() => handleRetryPendingDraft(pendingDrafts[0])}
                      disabled={isPending}
                      className="studio-button studio-button--sm"
                    >
                      Retry send
                    </button>
                    <button
                      onClick={() => handleDiscardDraft(pendingDrafts[0].id)}
                      className="studio-button-secondary studio-button--sm"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isError && (
              <div role="alert" className="page-notice page-notice--error">
                <AlertTriangle size={20} aria-hidden="true" />
                <div className="notice-body">
                  <span>
                    {error?.message ||
                      "Something went wrong. Please try again later."}
                  </span>
                  {lastAttemptedData && (
                    <>
                      <span className="page-small">
                        Save draft locally to send when you are back online?
                      </span>
                      <div className="notice-actions">
                        <button
                          onClick={handleSaveOffline}
                          className="studio-button-secondary studio-button--sm"
                        >
                          Save to send when online
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {draftError && (
              <div role="alert" className="page-notice page-notice--error">
                <AlertTriangle size={20} aria-hidden="true" />
                <span>{draftError}</span>
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
  );
};

export default ContactPage;
