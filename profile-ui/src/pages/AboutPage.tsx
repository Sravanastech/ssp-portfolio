import { SiteText } from "@/content/SiteContent";
import { useSiteContent } from "@/content/siteContentContext";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import ExperienceTimeline from "@/components/ExperienceTimeline";
import "@/styles/pages.css";

const AboutPage = () => {
  const { profile, experiences } = useSiteContent();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView?.();
  }, [hash]);
  return (
    <>
      <div className="studio-page">
        <div className="studio-container">
          <header className="studio-page-intro">
            <h1 className="studio-page-heading">
              <SiteText id="pages.AboutPage.text.1" />
              <br />
              <SiteText id="pages.AboutPage.text.2" />
            </h1>
            <div className="studio-split about-intro-split">
              <div>
                <p className="about-name">{profile.name}</p>
                <p className="about-meta">
                  {profile.fullName} — {profile.shortName} to colleagues
                </p>
                <p className="about-role">{profile.role}</p>
                <p className="about-meta">
                  {profile.employer}
                  <SiteText id="pages.AboutPage.text.3" />
                  {profile.location}
                </p>
              </div>
              <p className="studio-lede">
                <SiteText id="pages.AboutPage.text.4" />{" "}
                {profile.careerStartYear}
                <SiteText id="pages.AboutPage.text.5" />
              </p>
            </div>
          </header>

          <section className="studio-section studio-split studio-rule">
            <aside className="about-aside">
              <h2 className="page-title-2">
                <SiteText id="pages.AboutPage.text.6" />
              </h2>
              <nav aria-label="On this page" className="about-toc">
                <a href="#current-work">
                  <SiteText id="pages.AboutPage.text.8" />
                </a>
                <a href="#leadership">
                  <SiteText id="pages.AboutPage.text.9" />
                </a>
                <a href="#approach">
                  <SiteText id="pages.AboutPage.text.10" />
                </a>
                <a href="#experience">
                  <SiteText id="pages.AboutPage.text.13" />
                </a>
              </nav>
              <Link to="/resume" className="studio-link">
                <SiteText id="pages.AboutPage.text.14" />
              </Link>
              <p className="about-aside-note">
                <SiteText id="pages.AboutPage.text.20" />
              </p>
            </aside>
            <div className="studio-prose about-prose">
              <p className="page-copy">
                <SiteText id="pages.AboutPage.text.7" />
              </p>
              <h3 className="page-title-3" id="current-work">
                <SiteText id="pages.AboutPage.text.8" />
              </h3>
              <p className="page-copy">{profile.currentWork}</p>
              <h3 className="page-title-3" id="leadership">
                <SiteText id="pages.AboutPage.text.9" />
              </h3>
              <p className="page-copy">{profile.leadership}</p>
              <h3 className="page-title-3" id="approach">
                <SiteText id="pages.AboutPage.text.10" />
              </h3>
              <p className="page-copy">
                <SiteText id="pages.AboutPage.text.11" />
              </p>
              <Link to="/work" className="studio-link">
                <SiteText id="pages.AboutPage.text.12" />
              </Link>
            </div>
          </section>

          <section className="studio-section studio-rule" id="experience">
            <div className="page-head-row">
              <h2 className="page-title-2">
                <SiteText id="pages.AboutPage.text.13" />
              </h2>
              <Link to="/resume" className="studio-link">
                <SiteText id="pages.AboutPage.text.14" />
              </Link>
            </div>
            <ExperienceTimeline items={experiences} />
          </section>

          <section className="studio-section studio-split studio-rule">
            <h2 className="page-title-2">
              <SiteText id="pages.AboutPage.text.15" />
            </h2>
            <div>
              <p className="studio-lede page-lede-gap">
                <SiteText id="pages.AboutPage.text.16" />
              </p>
              <div className="page-actions">
                <Link to="/contact" className="studio-button">
                  <SiteText id="pages.AboutPage.text.17" />
                </Link>
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="studio-link"
                >
                  <SiteText id="pages.AboutPage.text.18" />
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};
export default AboutPage;
