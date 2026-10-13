import { SiteText } from "@/content/SiteContent";
import { useSiteContent } from "@/content/SiteContent";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import SystemStudio from "./SystemStudio";

interface HeroSectionProps {
  title?: string;
  description?: string;
}
export default function HeroSection({
  title,
  description,
}: HeroSectionProps = {}) {
  const { profile } = useSiteContent();
  return (
    <section
      className="studio-hero"
      aria-label="Hero introduction and selected work"
    >
      <div className="studio-container">
        <div className="studio-hero-grid">
          <div className="studio-hero-copy">
            <nav className="studio-rail-nav" aria-label="Studio navigation">
              <Link to="/work"><SiteText id="components.HeroSection.text.1" /></Link>
              <Link to="/about"><SiteText id="components.HeroSection.text.2" /></Link>
              <Link to="/contact"><SiteText id="components.HeroSection.text.3" /></Link>
            </nav>
            <h1>{title ?? profile.headline}</h1>
            <p className="studio-hero-name">
              {profile.name}
              <span>
                {profile.role}<SiteText id="components.HeroSection.text.4" />{profile.employer}
              </span>
            </p>
            <p className="studio-hero-description">{description ?? profile.description}</p>
            <div className="studio-actions">
              <Link to="/work" className="studio-button studio-button-light"><SiteText id="components.HeroSection.text.5" /><ArrowUpRight size={20} aria-hidden="true" />
              </Link>
              <Link to="/contact" className="studio-hero-link"><SiteText id="components.HeroSection.text.6" /><ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <SystemStudio />
        </div>
        <div className="studio-hero-foot">
          <span><SiteText id="components.HeroSection.text.7" /></span>
          <a href="#selected-work"><SiteText id="components.HeroSection.text.8" /><ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
