import { SiteText } from "@/content/SiteContent";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/Breadcrumbs";
import BackToTop from "@/components/BackToTop";
import { openConsent } from "@/lib/analytics";
import "@/styles/pages.css";
import "@/styles/consent.css";

export default function PrivacyPage() {
  return (
    <>
      <div className="studio-page legal-page">
        <div className="studio-container">
          <Breadcrumbs
            items={[{ label: "Home", path: "/" }, { label: "Privacy Policy" }]}
          />
          <header className="studio-page-intro">
            <h1 className="studio-page-heading">
              <SiteText id="pages.PrivacyPage.text.2" />
            </h1>
          </header>
          <div className="studio-prose legal-prose">
            <p>
              <SiteText id="pages.PrivacyPage.text.3" />
            </p>
            <h2>
              <SiteText id="pages.PrivacyPage.text.4" />
            </h2>
            <p>
              <SiteText id="pages.PrivacyPage.text.5" />
            </p>
            <p>
              <SiteText id="pages.PrivacyPage.text.6" />{" "}
              <a href="https://www.cloudflare.com/privacypolicy/">
                <SiteText id="pages.PrivacyPage.text.7" />
              </a>
              <SiteText id="pages.PrivacyPage.text.8" />
            </p>
            <h2>
              <SiteText id="pages.PrivacyPage.text.9" />
            </h2>
            <p>
              <SiteText id="pages.PrivacyPage.text.10" />
            </p>
            <h2>
              <SiteText id="pages.PrivacyPage.text.11" />
            </h2>
            <p>
              <SiteText id="pages.PrivacyPage.text.12" />
            </p>
            <h2>
              <SiteText id="pages.PrivacyPage.text.13" />
            </h2>
            <p>
              <SiteText id="pages.PrivacyPage.text.14" />
            </p>
            <ul>
              <li>
                <SiteText id="pages.PrivacyPage.text.22" />
              </li>
              <li>
                <SiteText id="pages.PrivacyPage.text.23" />
              </li>
              <li>
                <SiteText id="pages.PrivacyPage.text.24" />
              </li>
              <li>
                <SiteText id="pages.PrivacyPage.text.25" />{" "}
                <button
                  type="button"
                  className="consent-link"
                  onClick={openConsent}
                >
                  <SiteText id="pages.PrivacyPage.text.26" />
                </button>
              </li>
              <li>
                <SiteText id="pages.PrivacyPage.text.27" />
              </li>
              <li>
                <SiteText id="pages.PrivacyPage.text.28" />{" "}
                <a href="https://policies.google.com/privacy">
                  <SiteText id="pages.PrivacyPage.text.29" />
                </a>
                .
              </li>
            </ul>
            <p>
              <SiteText id="pages.PrivacyPage.text.30" />
            </p>
            <h2>
              <SiteText id="pages.PrivacyPage.text.15" />
            </h2>
            <p>
              <SiteText id="pages.PrivacyPage.text.16" />
            </p>
            <h2>
              <SiteText id="pages.PrivacyPage.text.17" />
            </h2>
            <p>
              <SiteText id="pages.PrivacyPage.text.18" />
            </p>
            <p>
              <SiteText id="pages.PrivacyPage.text.19" />{" "}
              <Link to="/contact">
                <SiteText id="pages.PrivacyPage.text.20" />
              </Link>
              <SiteText id="pages.PrivacyPage.text.21" />
            </p>
          </div>
        </div>
      </div>
      <BackToTop />
    </>
  );
}
