import { SiteText } from "@/content/SiteContent";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/Breadcrumbs";
import BackToTop from "@/components/BackToTop";
import "@/styles/pages.css";

export default function TermsAndConditionsPage() {
  return (
    <>
      <div className="studio-page legal-page">
        <div className="studio-container">
          <Breadcrumbs
            items={[
              { label: "Home", path: "/" },
              { label: "Terms and Conditions" },
            ]}
          />
          <header className="studio-page-intro">
            <h1 className="studio-page-heading">
              <SiteText id="pages.TermsAndConditions.text.2" />
            </h1>
          </header>
          <div className="studio-prose legal-prose">
            <p>
              <SiteText id="pages.TermsAndConditions.text.3" />
            </p>

            <h2>
              <SiteText id="pages.TermsAndConditions.text.4" />
            </h2>
            <p>
              <SiteText id="pages.TermsAndConditions.text.5" />
            </p>

            <h2>
              <SiteText id="pages.TermsAndConditions.text.6" />
            </h2>
            <p>
              <SiteText id="pages.TermsAndConditions.text.7" />
            </p>

            <h2>
              <SiteText id="pages.TermsAndConditions.text.8" />
            </h2>
            <p>
              <SiteText id="pages.TermsAndConditions.text.9" />
            </p>

            <h2>
              <SiteText id="pages.TermsAndConditions.text.10" />
            </h2>
            <p>
              <SiteText id="pages.TermsAndConditions.text.11" />
            </p>

            <h2>
              <SiteText id="pages.TermsAndConditions.text.12" />
            </h2>
            <p>
              <SiteText id="pages.TermsAndConditions.text.13" />
            </p>

            <h2>
              <SiteText id="pages.TermsAndConditions.text.14" />
            </h2>
            <p>
              <SiteText id="pages.TermsAndConditions.text.15" />
            </p>

            <h2>
              <SiteText id="pages.TermsAndConditions.text.16" />
            </h2>
            <p>
              <SiteText id="pages.TermsAndConditions.text.17" />
            </p>

            <p>
              <SiteText id="pages.TermsAndConditions.text.18" />{" "}
              <Link to="/contact">
                <SiteText id="pages.TermsAndConditions.text.19" />
              </Link>
              <SiteText id="pages.TermsAndConditions.text.20" />
            </p>
          </div>
        </div>
      </div>
      <BackToTop />
    </>
  );
}
