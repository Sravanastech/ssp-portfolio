import { SiteText } from "@/content/SiteContent";
import { useSiteContent } from "@/content/SiteContent";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import ProjectArtwork from "@/components/ProjectArtwork";

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
          <h1 className="studio-page-heading"><SiteText id="pages.WorkPage.text.1" /><br /><SiteText id="pages.WorkPage.text.2" /></h1>
          <p className="studio-lede"><SiteText id="pages.WorkPage.text.3" /></p>
          <p
            className="mt-6 max-w-2xl text-sm"
            style={{ color: "var(--color-textSecondary)" }}
          ><SiteText id="pages.WorkPage.text.4" /></p>
        </header>
        <nav aria-label="Case studies" className="studio-case-nav">
          {caseStudies.map((study) => (
            <a key={study.id} href={`#${study.id}`}>
              {study.name}
            </a>
          ))}
        </nav>
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
                  <span>{study.organization}</span><SiteText id="pages.WorkPage.text.5" />{study.role}
                </p>
                <p className="studio-lede">{study.summary}</p>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-textSecondary)" }}
                >
                  {study.technologies.join(" · ")}
                </p>
              </div>
              <ProjectArtwork id={study.id} />
            </div>
            <div className="studio-case-body">
              <section>
                <h3><SiteText id="pages.WorkPage.text.6" /></h3>
                <p>{study.problem}</p>
              </section>
              <section>
                <h3><SiteText id="pages.WorkPage.text.7" /></h3>
                <p>{study.contribution}</p>
              </section>
              <section>
                <h3><SiteText id="pages.WorkPage.text.8" /></h3>
                <p>{study.outcome}</p>
              </section>
            </div>
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
              <figcaption>{study.flowNote}</figcaption>
            </figure>
          </article>
        ))}
        <section className="studio-section studio-closing">
          <div>
            <h2><SiteText id="pages.WorkPage.text.9" /></h2>
            <p><SiteText id="pages.WorkPage.text.10" /></p>
          </div>
          <Link to="/contact" className="studio-button"><SiteText id="pages.WorkPage.text.11" /><ArrowUpRight size={20} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
