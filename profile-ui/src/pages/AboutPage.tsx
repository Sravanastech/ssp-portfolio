import { SiteText } from "@/content/SiteContent";
import { useSiteContent } from "@/content/SiteContent";
import { Link } from "react-router-dom";
import { useTheme } from "@/theme/ThemeContext";
import ExperienceTimeline from "@/components/ExperienceTimeline";

const AboutPage = () => {
  const { profile, experiences } = useSiteContent();
  const { colors } = useTheme();
  return (
    <>
      <div
        className="studio-page"
        style={{ backgroundColor: colors.background, color: colors.text }}
      >
        <div className="studio-container">
          <header className="studio-page-intro">
            <h1 className="studio-page-heading"><SiteText id="pages.AboutPage.text.1" /><br /><SiteText id="pages.AboutPage.text.2" /></h1>
            <div className="studio-split mt-10">
              <div>
                <p className="text-2xl font-semibold">{profile.name}</p>
                <p className="mt-2" style={{ color: colors.primary }}>
                  {profile.role}
                </p>
                <p className="mt-2" style={{ color: colors.textSecondary }}>
                  {profile.employer}<SiteText id="pages.AboutPage.text.3" />{profile.location}
                </p>
              </div>
              <p className="studio-lede"><SiteText id="pages.AboutPage.text.4" />{" "}
                {profile.careerStartYear}<SiteText id="pages.AboutPage.text.5" /></p>
            </div>
          </header>

          <section
            className="studio-section studio-split border-t"
            style={{ borderColor: colors.border }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold"><SiteText id="pages.AboutPage.text.6" /></h2>
            <div className="studio-prose">
              <p
                className="text-lg leading-relaxed"
                style={{ color: colors.textSecondary }}
              ><SiteText id="pages.AboutPage.text.7" /></p>
              <h3 className="text-2xl font-semibold mt-10 mb-4"><SiteText id="pages.AboutPage.text.8" /></h3>
              <p
                className="text-lg leading-relaxed"
                style={{ color: colors.textSecondary }}
              >
                {profile.currentWork}
              </p>
              <h3 className="text-2xl font-semibold mt-10 mb-4"><SiteText id="pages.AboutPage.text.9" /></h3>
              <p
                className="text-lg leading-relaxed"
                style={{ color: colors.textSecondary }}
              >
                {profile.leadership}
              </p>
              <h3 className="text-2xl font-semibold mt-10 mb-4"><SiteText id="pages.AboutPage.text.10" /></h3>
              <p
                className="text-lg leading-relaxed"
                style={{ color: colors.textSecondary }}
              ><SiteText id="pages.AboutPage.text.11" /></p>
              <Link to="/work" className="studio-link inline-block mt-6"><SiteText id="pages.AboutPage.text.12" /></Link>
            </div>
          </section>

          <section
            className="studio-section border-t"
            style={{ borderColor: colors.border }}
          >
            <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
              <h2 className="text-3xl md:text-4xl font-semibold"><SiteText id="pages.AboutPage.text.13" /></h2>
              <Link
                to="/resume"
                className="studio-link"
              ><SiteText id="pages.AboutPage.text.14" /></Link>
            </div>
            <ExperienceTimeline items={experiences} />
          </section>

          <section
            className="studio-section studio-split border-t"
            style={{ borderColor: colors.border }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold"><SiteText id="pages.AboutPage.text.15" /></h2>
            <div>
              <p className="studio-lede mb-8"><SiteText id="pages.AboutPage.text.16" /></p>
              <div className="flex items-center flex-wrap gap-6">
                <Link to="/contact" className="studio-button"><SiteText id="pages.AboutPage.text.17" /></Link>
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="studio-link"
                ><SiteText id="pages.AboutPage.text.18" /></a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};
export default AboutPage;
