import { useState } from "react";
import { ArrowRight, ArrowUpRight, Command, Terminal } from "lucide-react";
import { useSiteContent } from "@/content/siteContentContext";
import PrefetchLink from "@/components/PrefetchLink";
import { useAsciiScramble } from "@/lib/motion";
import { FUI_OPEN_COMMAND_EVENT } from "@/components/AetherStage";
import FuiDossierModal from "@/components/hud/FuiDossierModal";

const BENTO_SPANS = [
  "fui-module--wide",
  "fui-module--tall",
  "fui-module--tall",
  "fui-module--wide",
  "fui-module--full",
] as const;

/**
 * FUI Minimalism Homepage ("Oblivion" / "The Martian" / "Tron: Legacy" + Swiss Precision):
 * 1. The Boot Sequence Hero (GPU grid-line draw + masked slide + ASCII decryption + ⌘K trigger)
 * 2. Asymmetric Chamfered Bento Grid ("Mission Modules" — all 5 real case studies)
 * 3. Interactive Technical Dossier Modal (inline SVG system flow + breakdown)
 * 4. Career Telemetry Roll & Closing Dock
 */
export default function AetherHomeStage(): React.ReactElement {
  const { profile, caseStudies, experiences } = useSiteContent();
  const [dossierIndex, setDossierIndex] = useState<number | null>(null);
  const decryptedHeadline = useAsciiScramble(profile.headline, true);

  const openCommandPalette = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(FUI_OPEN_COMMAND_EVENT));
    }
  };

  const activeStudy =
    dossierIndex !== null ? (caseStudies[dossierIndex] ?? null) : null;

  return (
    <div className="fui-page">
      {/* 1. HERO: THE BOOT SEQUENCE */}
      <section className="fui-hero" aria-labelledby="fui-hero-heading">
        <div className="fui-grid-line-x" aria-hidden="true" />
        <div className="fui-grid-line-y" aria-hidden="true" />

        <div className="fui-container fui-hero-inner">
          <div className="fui-boot-eyebrow">
            <Terminal size={14} aria-hidden="true" />
            <span>
              SYS.BOOT // {profile.name.toUpperCase()} // SINCE{" "}
              {profile.careerStartYear}
            </span>
          </div>

          <h1 id="fui-hero-heading" className="fui-hero-title">
            {decryptedHeadline}
          </h1>

          <p className="fui-hero-sub">
            <span>{profile.role}</span>
            <span aria-hidden="true"> // </span>
            <span>{profile.employer}</span>
            <span aria-hidden="true"> // </span>
            <span>{profile.location}</span>
          </p>

          <p className="fui-hero-desc">{profile.description}</p>

          <div className="fui-hero-actions">
            <PrefetchLink to="/work" className="fui-btn-primary">
              Inspect mission archive
              <ArrowUpRight size={16} aria-hidden="true" />
            </PrefetchLink>
            <PrefetchLink to="/contact" className="fui-btn-secondary">
              Initiate contact
              <ArrowRight size={15} aria-hidden="true" />
            </PrefetchLink>
            <button
              type="button"
              className="fui-cmd-pill"
              onClick={openCommandPalette}
            >
              <Command size={14} aria-hidden="true" />
              <span>Press ⌘K for System Menu</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. ASYMMETRIC BENTO GRID: MISSION MODULES */}
      <section
        id="fui-missions"
        className="fui-section"
        aria-labelledby="fui-missions-heading"
      >
        <div className="fui-container">
          <header className="fui-section-head">
            <p className="fui-kicker">MISSION MODULES // 01–05</p>
            <h2 id="fui-missions-heading" className="fui-section-title">
              Selected production systems
            </h2>
          </header>

          <div className="fui-bento">
            {caseStudies.map((study, index) => (
              <article
                key={study.id}
                className={`fui-module ${BENTO_SPANS[index % BENTO_SPANS.length]}`}
              >
                <div className="fui-module-top">
                  <span className="fui-module-id">
                    PRJ // {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="fui-module-org">
                    {study.organization} · {study.role}
                  </span>
                </div>

                <h3 className="fui-module-title">
                  <PrefetchLink to={`/work/${study.slug}`}>
                    {study.name}
                  </PrefetchLink>
                </h3>

                <p className="fui-module-summary">{study.summary}</p>
                <p className="fui-module-preview">{study.preview}</p>

                <ul
                  className="fui-tags"
                  role="list"
                  aria-label={`${study.name} architecture stack`}
                >
                  {study.technologies.slice(0, 5).map((tech) => (
                    <li key={tech}>{tech}</li>
                  ))}
                </ul>

                <div className="fui-module-footer">
                  <button
                    type="button"
                    className="fui-module-cta"
                    onClick={() => setDossierIndex(index)}
                  >
                    Open technical dossier
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                  <PrefetchLink
                    to={`/work/${study.slug}`}
                    className="fui-module-link"
                  >
                    Full page
                    <ArrowRight size={14} aria-hidden="true" />
                  </PrefetchLink>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CAREER TELEMETRY TIMELINE */}
      <section className="fui-section" aria-labelledby="fui-career-heading">
        <div className="fui-container">
          <header className="fui-section-head">
            <p className="fui-kicker">SERVICE LOG // 2016–PRESENT</p>
            <h2 id="fui-career-heading" className="fui-section-title">
              Engineering leadership &amp; delivery
            </h2>
          </header>

          <ol className="fui-timeline" role="list">
            {experiences.map((exp, idx) => (
              <li
                key={`${exp.company}-${exp.year}`}
                className="fui-timeline-row"
              >
                <span className="fui-timeline-idx">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="fui-timeline-year">{exp.year}</span>
                <strong className="fui-timeline-company">{exp.company}</strong>
                <span className="fui-timeline-role">{exp.title}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. CLOSING DOCK */}
      <section className="fui-section" aria-labelledby="fui-closing-heading">
        <div className="fui-container">
          <div className="fui-closing">
            <div>
              <p className="fui-kicker">COMMS CHANNEL // OPEN</p>
              <h2 id="fui-closing-heading" className="fui-section-title">
                Hiring for a senior engineering role?
              </h2>
              <p className="fui-hero-desc">
                Share the role, team, and technical direction — or press ⌘K to
                copy my direct email.
              </p>
            </div>
            <div className="fui-hero-actions">
              <PrefetchLink to="/contact" className="fui-btn-primary">
                Get in touch
                <ArrowUpRight size={16} aria-hidden="true" />
              </PrefetchLink>
              <PrefetchLink to="/resume" className="fui-btn-secondary">
                View resume
                <ArrowRight size={15} aria-hidden="true" />
              </PrefetchLink>
            </div>
          </div>
        </div>
      </section>

      <FuiDossierModal
        study={activeStudy}
        index={dossierIndex ?? 0}
        onClose={() => setDossierIndex(null)}
      />
    </div>
  );
}
