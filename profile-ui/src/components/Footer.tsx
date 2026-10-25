import { SiteText } from "@/content/SiteContent";
import { useSiteContent } from "@/content/siteContentContext";
import PrefetchLink from "@/components/PrefetchLink";
import { ArrowUpRight } from "lucide-react";
import { isAnalyticsEnabled, openConsent } from "@/lib/analytics";
import "@/styles/consent.css";

export default function Footer() {
  const { profile } = useSiteContent();
  return (
    <footer className="studio-footer">
      <div className="studio-container">
        <div className="studio-footer-main">
          <PrefetchLink to="/" className="studio-footer-name">
            <SiteText id="components.Footer.text.1" />
            <br />
            <SiteText id="components.Footer.text.2" />
            <span>
              <SiteText id="components.Footer.text.3" />
            </span>
          </PrefetchLink>
          <div>
            <p>
              <SiteText id="components.Footer.text.4" />
              <br />
              <SiteText id="components.Footer.text.5" />
            </p>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              <SiteText id="components.Footer.text.6" />
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <a href={`mailto:${profile.email}`}>
              <SiteText id="components.Footer.text.7" />
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="studio-footer-bottom">
          <span>
            <SiteText id="components.Footer.text.13" />
            {new Date().getFullYear()} {profile.name}
          </span>
          <span>{profile.location}</span>
          <nav aria-label="Legal">
            <PrefetchLink to="/privacy">
              <SiteText id="components.Footer.text.14" />
            </PrefetchLink>
            <PrefetchLink to="/termsconditions">
              <SiteText id="components.Footer.text.15" />
            </PrefetchLink>
            {isAnalyticsEnabled() && (
              <button
                type="button"
                className="consent-link"
                onClick={openConsent}
              >
                <SiteText id="components.Footer.text.16" />
              </button>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
