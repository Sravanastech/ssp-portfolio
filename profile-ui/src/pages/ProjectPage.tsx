import { Link, useParams } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProjectArtwork from "@/components/ProjectArtwork";
import { useSiteContent } from "@/content/siteContentContext";
import ErrorPage from "./ErrorPage";
import "@/styles/pages.css";
import "@/styles/project-page.css";

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { caseStudies } = useSiteContent();
  const index = caseStudies.findIndex((item) => item.slug === slug);
  if (index === -1) {
    return (
      <ErrorPage
        code="404"
        message="Project not found"
        redirectPath="/work"
        autoRedirect={false}
      />
    );
  }
  const study = caseStudies[index];
  const related = [1, 2].map(
    (offset) => caseStudies[(index + offset) % caseStudies.length],
  );
  return (
    <div className="studio-page project-page">
      <div className="studio-container">
        <header className="studio-page-intro project-intro">
          <Breadcrumbs
            items={[
              { label: "Home", path: "/" },
              { label: "Work", path: "/work" },
              { label: study.name },
            ]}
          />
          <h1 className="studio-page-heading">{study.name}</h1>
          <p className="studio-lede">{study.summary}</p>
          <dl className="project-meta">
            <div>
              <dt>Employer</dt>
              <dd>{study.organization}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{study.role}</dd>
            </div>
          </dl>
          <ul className="project-stack" aria-label="Technologies">
            {study.technologies.map((technology) => (
              <li key={technology}>{technology}</li>
            ))}
          </ul>
        </header>
        <figure className="project-figure">
          <ProjectArtwork id={study.id} />
          <figcaption>{study.flowNote}</figcaption>
        </figure>
        <div className="project-body">
          <section aria-labelledby="project-problem">
            <h2 id="project-problem">Problem</h2>
            <p>{study.problem}</p>
          </section>
          <section aria-labelledby="project-contribution">
            <h2 id="project-contribution">My contribution</h2>
            <p>{study.contribution}</p>
          </section>
          <section aria-labelledby="project-outcome">
            <h2 id="project-outcome">Outcome</h2>
            <p>{study.outcome}</p>
          </section>
        </div>
        <section className="project-related" aria-labelledby="project-related">
          <h2 id="project-related">Related work</h2>
          <ul>
            {related.map((item) => (
              <li key={item.id}>
                <Link to={`/work/${item.slug}`}>
                  <span className="project-related-org">
                    {item.organization}
                  </span>
                  <span className="project-related-name">{item.name}</span>
                  <span className="project-related-summary">
                    {item.summary}
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="studio-section studio-closing">
          <div>
            <h2>Hiring for an engineering role?</h2>
            <p>Send an inquiry, or review the resume.</p>
          </div>
          <div className="project-cta">
            <Link to="/contact" className="studio-button">
              Get in touch
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
            <Link to="/resume" className="studio-button-secondary">
              View resume
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
