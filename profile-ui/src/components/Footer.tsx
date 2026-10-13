import { SiteText } from "@/content/SiteContent";
import { useSiteContent } from "@/content/SiteContent";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import ThemeSwitcher from "./ThemeSwitcher";
import CompositionSwitcher from "./CompositionSwitcher";

export default function Footer() {
  const { profile } = useSiteContent();
  return (
    <footer className="studio-footer">
      <div className="studio-container">
        <div className="studio-footer-main">
          <Link to="/" className="studio-footer-name"><SiteText id="components.Footer.text.1" /><br /><SiteText id="components.Footer.text.2" /><span><SiteText id="components.Footer.text.3" /></span>
          </Link>
          <div>
            <p><SiteText id="components.Footer.text.4" /><br /><SiteText id="components.Footer.text.5" /></p>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            ><SiteText id="components.Footer.text.6" /><ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <a href={`mailto:${profile.email}`}><SiteText id="components.Footer.text.7" /><ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
        <details className="appearance-settings">
          <summary><SiteText id="components.Footer.text.8" /></summary>
          <div className="appearance-options">
            <div>
              <h2><SiteText id="components.Footer.text.9" /></h2>
              <p><SiteText id="components.Footer.text.10" /></p>
              <CompositionSwitcher />
            </div>
            <div>
              <h2><SiteText id="components.Footer.text.11" /></h2>
              <p><SiteText id="components.Footer.text.12" /></p>
              <ThemeSwitcher />
            </div>
          </div>
        </details>
        <div className="studio-footer-bottom">
          <span><SiteText id="components.Footer.text.13" />{new Date().getFullYear()} {profile.name}
          </span>
          <span>{profile.location}</span>
          <nav aria-label="Legal">
            <Link to="/privacy"><SiteText id="components.Footer.text.14" /></Link>
            <Link to="/termsconditions"><SiteText id="components.Footer.text.15" /></Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
