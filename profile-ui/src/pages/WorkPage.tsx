import { SiteText } from "@/content/SiteContent";
import { useSiteContent } from "@/content/siteContentContext";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import ProjectArtwork from "@/components/ProjectArtwork";
import CaseNav from "@/components/CaseNav";
import "@/styles/project-page.css";

export default function WorkPage() {
  const { caseStudies } = useSiteContent();
  const { hash } = useLocation();
  useEffect(() => {
    const study = caseStudies.find((item) => `#${item.id}` === hash);
    if (study)
      document.getElementById(study.id)?.scrollIntoView?.({ block: "start" });
  }, [hash, caseStudies]);
  return (
    <div className="studio-page">
      <div className="studio-container">
        <header className="studio-page-intro">
          <h1 className="studio-page-heading">
            <SiteText id="pages.WorkPage.text.1" />
            <br />
            <SiteText id="pages.WorkPage.text.2" />
          </h1>
          <p className="studio-lede">
            <SiteText id="pages.WorkPage.text.3" />
          </p>
          <p className="work-note">
            <SiteText id="pages.WorkPage.text.4" />
          </p>
        </header>
        <CaseNav
          label="Case studies"
          items={caseStudies.map(({ id, name }) => ({ id, name }))}
        />
        {caseStudies.map((study) => (
          <article
            className="studio-case"
            key={study.id}
            id={study.id}
            aria-labelledby={`${study.id}-title`}
          >
            <div className="studio-case-head">
              <div>
                <h2 id={`${study.id}-title`}>{study.name}</h2>
                <p className="font-medium">
                  <span>{study.organization}</span>{" "}
                  <SiteText id="pages.WorkPage.text.5" />
                  {study.role}
                </p>
                <p className="studio-lede">{study.summary}</p>
                <p className="work-stack">{study.technologies.join(" · ")}</p>
              </div>
              <ProjectArtwork id={study.id} />
            </div>
            <div className="studio-case-body">
              <section>
                <h3>
                  <SiteText id="pages.WorkPage.text.6" />
                </h3>
                <p>{study.problem}</p>
              </section>
              <section>
                <h3>
                  <SiteText id="pages.WorkPage.text.7" />
                </h3>
                <p>{study.contribution}</p>
              </section>
              <section>
                <h3>
                  <SiteText id="pages.WorkPage.text.8" />
                </h3>
                <p>{study.outcome}</p>
              </section>
            </div>
            <Link
              className="studio-link studio-case-more"
              to={`/work/${study.slug}`}
              aria-label={`Read the full case study: ${study.name}`}
            >
              Read the full case study
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <figure className="studio-case-flow">
              <ol aria-label={`${study.name} conceptual workflow`}>
                {study.flow.map((step, index) => (
                  <li key={step}>
                    <span>{step}</span>
                    {index < study.flow.length - 1 && (
                      <ArrowRight
                        className="shrink-0"
                        size={20}
                        aria-hidden="true"
                      />
                    )}
                  </li>
                ))}
              </ol>
            </figure>
          </article>
        ))}
        <section className="studio-section studio-closing">
          <div>
            <h2>
              <SiteText id="pages.WorkPage.text.9" />
            </h2>
            <p>
              <SiteText id="pages.WorkPage.text.10" />
            </p>
          </div>
          <Link to="/contact" className="studio-button">
            <SiteText id="pages.WorkPage.text.11" />
            <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
