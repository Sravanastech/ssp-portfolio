import { lazy, Suspense } from "react";
import { SiteText } from "@/content/SiteContent";
import { useSiteContent } from "@/content/siteContentContext";
import { useParadigm } from "@/theme/ParadigmContext";
import PrefetchLink from "@/components/PrefetchLink";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import HeroSection from "@/components/HeroSection";
import ProjectArtwork from "@/components/ProjectArtwork";
import EmployerTimeline from "@/components/EmployerTimeline";

const LazyAetherHomeStage = lazy(() => import("@/components/AetherHomeStage"));

export default function HomePage() {
  const { isAether } = useParadigm();
  const { caseStudies, experiences, copy } = useSiteContent();

  if (isAether) {
    return (
      <Suspense fallback={null}>
        <LazyAetherHomeStage />
      </Suspense>
    );
  }

  const copyMap = copy as Record<string, string>;
  const workHeadingGhost = [
    copyMap["pages.HomePage.text.1"],
    copyMap["pages.HomePage.text.2"],
  ]
    .filter(Boolean)
    .join(" ");
  // Tools derived from the stacks already listed on the case studies, most-used first.
  const tallies = new Map<string, number>();
  caseStudies.forEach((study) =>
    study.technologies.forEach((tech) =>
      tallies.set(tech, (tallies.get(tech) ?? 0) + 1),
    ),
  );
  const tools = [...tallies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tech]) => tech);
  return (
    <>
      <HeroSection />
      <section
        id="selected-work"
        className="studio-container studio-section"
        aria-labelledby="selected-work-title"
      >
        <div className="studio-section-heading" data-ghost={workHeadingGhost}>
          <h2 id="selected-work-title">
            <SiteText id="pages.HomePage.text.1" />
            <br />
            <SiteText id="pages.HomePage.text.2" />
          </h2>
          <p>
            <SiteText id="pages.HomePage.text.3" />
          </p>
        </div>
        <div className="studio-project-grid">
          {caseStudies.map((study) => (
            <article className="studio-project" key={study.id}>
              <PrefetchLink
                className="studio-project-image"
                to={`/work/${study.slug}`}
                aria-label={`Read the ${study.name} case study`}
              >
                <ProjectArtwork id={study.id} />
                <span className="studio-project-open">
                  <ArrowUpRight aria-hidden="true" />
                </span>
              </PrefetchLink>
              <div className="studio-project-copy">
                <p className="studio-project-meta">
                  {study.organization}
                  <span>{study.role}</span>
                </p>
                <h3>
                  <PrefetchLink to={`/work/${study.slug}`}>
                    {study.name}
                    <ArrowUpRight size={22} aria-hidden="true" />
                  </PrefetchLink>
                </h3>
                <p className="studio-project-summary">{study.summary}</p>
                <p className="studio-project-contribution">{study.preview}</p>
                <ul
                  className="studio-project-stack"
                  aria-label="Project technologies"
                >
                  {study.technologies.slice(0, 4).map((technology) => (
                    <li key={technology}>{technology}</li>
                  ))}
                </ul>
                <PrefetchLink
                  className="studio-link"
                  to={`/work/${study.slug}`}
                >
                  <SiteText id="pages.HomePage.text.4" />
                  <ArrowRight size={16} aria-hidden="true" />
                </PrefetchLink>
              </div>
            </article>
          ))}
        </div>
        <PrefetchLink className="studio-link" to="/work">
          <SiteText id="pages.HomePage.text.5" />
          <ArrowRight size={18} aria-hidden="true" />
        </PrefetchLink>
      </section>
      <section
        className="studio-container studio-proof"
        aria-labelledby="employers-title"
      >
        <div className="studio-proof-employers">
          <div>
            <h2 id="employers-title">
              <SiteText id="pages.HomePage.text.25" />
            </h2>
            <PrefetchLink className="studio-link" to="/about#experience">
              <SiteText id="pages.HomePage.text.26" />
              <ArrowRight size={16} aria-hidden="true" />
            </PrefetchLink>
          </div>
          <EmployerTimeline items={experiences} />
        </div>
        <div className="studio-proof-tools">
          <h3>
            <SiteText id="pages.HomePage.text.27" />
          </h3>
          <ul role="list">
            {tools.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </div>
      </section>
      <section
        className="studio-approach studio-section"
        aria-labelledby="approach-title"
      >
        <div className="studio-container studio-split">
          <div>
            <h2 id="approach-title">
              <SiteText id="pages.HomePage.text.6" />
              <br />
              <SiteText id="pages.HomePage.text.7" />
            </h2>
            <p className="studio-lede">
              <SiteText id="pages.HomePage.text.8" />
            </p>
            <PrefetchLink className="studio-link" to="/about">
              <SiteText id="pages.HomePage.text.9" />{" "}
              <ArrowUpRight size={18} aria-hidden="true" />
            </PrefetchLink>
          </div>
          <div className="studio-principles">
            <section>
              <h3>
                <SiteText id="pages.HomePage.text.10" />
              </h3>
              <p>
                <SiteText id="pages.HomePage.text.11" />
              </p>
              <span>
                <SiteText id="pages.HomePage.text.12" />
              </span>
            </section>
            <section>
              <h3>
                <SiteText id="pages.HomePage.text.13" />
              </h3>
              <p>
                <SiteText id="pages.HomePage.text.23" />
              </p>
              <span>
                <SiteText id="pages.HomePage.text.14" />
              </span>
            </section>
            <section>
              <h3>
                <SiteText id="pages.HomePage.text.15" />
              </h3>
              <p>
                <SiteText id="pages.HomePage.text.16" />
              </p>
              <span>
                <SiteText id="pages.HomePage.text.17" />
              </span>
            </section>
            <section>
              <h3>
                <SiteText id="pages.HomePage.text.18" />
              </h3>
              <p>
                <SiteText id="pages.HomePage.text.24" />
              </p>
              <span>
                <SiteText id="pages.HomePage.text.19" />
              </span>
            </section>
          </div>
        </div>
      </section>
      <section className="studio-container studio-section studio-closing">
        <div>
          <h2>
            <SiteText id="pages.HomePage.text.20" />
          </h2>
          <p>
            <SiteText id="pages.HomePage.text.21" />
          </p>
        </div>
        <PrefetchLink className="studio-button" to="/contact">
          <SiteText id="pages.HomePage.text.22" />
          <ArrowUpRight size={20} aria-hidden="true" />
        </PrefetchLink>
      </section>
    </>
  );
}
