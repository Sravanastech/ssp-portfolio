import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useSiteContent } from "@/content/siteContentContext";
import PrefetchLink from "@/components/PrefetchLink";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

interface ActDefinition {
  readonly id: string;
  readonly num: string;
  readonly code: string;
  readonly label: string;
}

const ACTS: readonly ActDefinition[] = [
  { id: "aether-origin", num: "01", code: "01 / ORIGIN", label: "Origin" },
  {
    id: "aether-work",
    num: "02",
    code: "02 / SHATTER",
    label: "Selected Work",
  },
  {
    id: "aether-spine",
    num: "03",
    code: "03 / SPINE",
    label: "Career & Stack",
  },
  { id: "aether-converge", num: "04", code: "04 / CONVERGE", label: "Contact" },
];

const WORD_VECTORS: readonly { x: string; y: string }[] = [
  { x: "-18vw", y: "-14vh" },
  { x: "14vw", y: "-18vh" },
  { x: "-22vw", y: "10vh" },
  { x: "20vw", y: "-6vh" },
  { x: "-10vw", y: "18vh" },
  { x: "18vw", y: "16vh" },
];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
  } catch {
    return false;
  }
}

export default function AetherHomeStage(): React.ReactElement {
  const { profile, caseStudies, experiences } = useSiteContent();
  const stageRef = useRef<HTMLDivElement>(null);
  const actCodeRef = useRef<HTMLSpanElement>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const headlineWords = useMemo(
    () => profile.headline.trim().split(/\s+/),
    [profile.headline],
  );

  const topTechnologies = useMemo(() => {
    const tallies = new Map<string, number>();
    caseStudies.forEach((study) =>
      study.technologies.forEach((tech) =>
        tallies.set(tech, (tallies.get(tech) ?? 0) + 1),
      ),
    );
    return [...tallies.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tech]) => tech);
  }, [caseStudies]);

  // Single zero-re-render RAF scroll driver setting --t and --focus directly on DOM nodes.
  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;

    const scenes = Array.from(
      root.querySelectorAll<HTMLElement>(".aether-scene"),
    );
    const shards = Array.from(
      root.querySelectorAll<HTMLElement>(".aether-shard"),
    );
    const targets = [...scenes, ...shards];

    const setActiveAct = (actIndex: number) => {
      const active = ACTS[actIndex] ?? ACTS[0];
      if (
        actCodeRef.current &&
        actCodeRef.current.textContent !== active.code
      ) {
        actCodeRef.current.textContent = active.code;
      }
      pillRefs.current.forEach((pill, index) => {
        if (!pill) return;
        const isCurrent = index === actIndex;
        pill.dataset.active = isCurrent ? "true" : "false";
        if (isCurrent) {
          pill.setAttribute("aria-current", "location");
        } else {
          pill.removeAttribute("aria-current");
        }
      });
    };

    if (prefersReducedMotion()) {
      targets.forEach((el) => {
        el.style.setProperty("--t", "0");
        el.style.setProperty("--focus", "1");
      });
      setActiveAct(0);
      return;
    }

    let frame = 0;

    const flush = () => {
      frame = 0;
      const vh = window.innerHeight || 1;
      const vpCenter = vh / 2;

      let closestActIndex = 0;
      let closestActDistance = Number.POSITIVE_INFINITY;

      scenes.forEach((scene, index) => {
        const rect = scene.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const halfSpan = Math.max(1, vh * 0.55 + rect.height * 0.25);
        const rawT = (vpCenter - elCenter) / halfSpan;
        const t = Math.max(-1, Math.min(1, rawT));
        const focus = Math.max(0, 1 - Math.min(1, Math.abs(t) * 1.35));
        scene.style.setProperty("--t", t.toFixed(4));
        scene.style.setProperty("--focus", focus.toFixed(4));

        const distance = Math.abs(t);
        if (distance < closestActDistance) {
          closestActDistance = distance;
          closestActIndex = index;
        }
      });

      shards.forEach((shard) => {
        const rect = shard.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const halfSpan = Math.max(1, vh * 0.55 + rect.height * 0.25);
        const rawT = (vpCenter - elCenter) / halfSpan;
        const t = Math.max(-1, Math.min(1, rawT));
        const focus = Math.max(0, 1 - Math.min(1, Math.abs(t) * 1.35));
        shard.style.setProperty("--t", t.toFixed(4));
        shard.style.setProperty("--focus", focus.toFixed(4));
      });

      setActiveAct(closestActIndex);
    };

    flush();

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(flush);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const handleJumpToAct = (actId: string) => {
    const target = document.getElementById(actId);
    if (!target) return;
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <div className="aether-cinema" ref={stageRef}>
      {/* Fixed central Singularity Core + coordinate hairlines */}
      <div className="aether-singularity" aria-hidden="true">
        <div className="aether-axis-x" />
        <div className="aether-axis-y" />
        <div className="aether-core">
          <div className="aether-core-ring" />
          <span className="aether-core-monogram">SP</span>
          <span className="aether-core-act" ref={actCodeRef}>
            {ACTS[0].code}
          </span>
        </div>
      </div>

      {/* Chapter navigation pills */}
      <nav
        className="aether-chapters aether-chapter-nav"
        aria-label="Cinema chapters"
      >
        {ACTS.map((act, index) => (
          <button
            key={act.id}
            ref={(node) => {
              pillRefs.current[index] = node;
            }}
            type="button"
            className="aether-chapter-pill"
            data-act={act.id}
            data-active={index === 0 ? "true" : "false"}
            aria-current={index === 0 ? "location" : undefined}
            aria-label={`Jump to Act ${act.num}: ${act.label}`}
            onClick={() => handleJumpToAct(act.id)}
          >
            <span className="aether-chapter-num">{act.num}</span>
            <span className="aether-chapter-label">{act.label}</span>
          </button>
        ))}
      </nav>

      {/* Act 01 — The Origin Blast */}
      <section
        id="aether-origin"
        className="aether-scene aether-origin aether-scene-origin"
        data-act="01 / ORIGIN"
        aria-labelledby="aether-origin-title"
      >
        <div className="aether-origin-shell">
          <p className="aether-origin-eyebrow aether-act-kicker">01 / ORIGIN</p>
          <h1 id="aether-origin-title" className="aether-origin-title">
            {headlineWords.map((word, index) => {
              const vector = WORD_VECTORS[index % WORD_VECTORS.length];
              return (
                <span
                  key={`${word}-${index}`}
                  className="aether-word"
                  style={
                    {
                      "--word-index": index,
                      "--blast-x": vector.x,
                      "--blast-y": vector.y,
                    } as React.CSSProperties
                  }
                >
                  {word}
                  {index < headlineWords.length - 1 ? " " : ""}
                </span>
              );
            })}
          </h1>

          <div className="aether-origin-identity">
            <p className="aether-origin-name">{profile.name}</p>
            <p className="aether-origin-role">
              <span>{profile.role}</span>
              <span aria-hidden="true"> · </span>
              <span>{profile.employer}</span>
              <span aria-hidden="true"> · </span>
              <span>{profile.location}</span>
            </p>
            <p className="aether-origin-description">{profile.description}</p>
          </div>

          <div className="aether-origin-actions">
            <PrefetchLink
              to="/work"
              className="studio-button studio-button-light"
            >
              Explore selected work
              <ArrowUpRight size={18} aria-hidden="true" />
            </PrefetchLink>
            <PrefetchLink to="/contact" className="studio-hero-link">
              Get in touch
              <ArrowRight size={16} aria-hidden="true" />
            </PrefetchLink>
          </div>
        </div>
      </section>

      {/* Act 02 — Radial Shatter: Selected Work */}
      <section
        id="aether-work"
        className="aether-scene aether-work aether-scene-work"
        data-act="02 / SHATTER"
        aria-labelledby="aether-work-title"
      >
        <div className="aether-act-head aether-scene-header">
          <p className="aether-act-kicker">02 / SHATTER</p>
          <h2 id="aether-work-title">Selected Work</h2>
          <p className="aether-origin-sub aether-scene-lede">
            Enterprise interfaces, shared component platforms, and production
            delivery across banking, retail, and public-sector systems.
          </p>
        </div>

        <div className="aether-work-grid aether-shards">
          {caseStudies.map((study, index) => (
            <article
              key={study.id}
              className="aether-shard aether-work-shard"
              data-side={index % 2 === 0 ? "left" : "right"}
              style={
                {
                  "--shard-index": index,
                  "--shatter-dir": index % 2 === 0 ? -1 : 1,
                } as React.CSSProperties
              }
            >
              <div className="aether-shard-meta">
                <span className="aether-shard-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="aether-shard-org">{study.organization}</span>
                <span className="aether-shard-role">{study.role}</span>
              </div>

              <h3 className="aether-shard-title">
                <PrefetchLink to={`/work/${study.slug}`}>
                  {study.name}
                  <ArrowUpRight size={20} aria-hidden="true" />
                </PrefetchLink>
              </h3>

              <p className="aether-shard-summary">{study.summary}</p>
              <p className="aether-shard-preview">{study.preview}</p>

              <ul
                className="aether-shard-stack"
                role="list"
                aria-label={`${study.name} technologies`}
              >
                {study.technologies.map((technology) => (
                  <li key={technology}>{technology}</li>
                ))}
              </ul>

              <PrefetchLink className="studio-link" to={`/work/${study.slug}`}>
                Read case study
                <ArrowRight size={16} aria-hidden="true" />
              </PrefetchLink>
            </article>
          ))}
        </div>

        <div className="aether-scene-footer">
          <PrefetchLink className="studio-link" to="/work">
            View all case studies
            <ArrowRight size={18} aria-hidden="true" />
          </PrefetchLink>
        </div>
      </section>

      {/* Act 03 — The Architectural Spine: Career & Stack */}
      <section
        id="aether-spine"
        className="aether-scene aether-spine aether-scene-spine"
        data-act="03 / SPINE"
        aria-labelledby="aether-spine-title"
      >
        <div className="aether-act-head aether-scene-header">
          <p className="aether-act-kicker">03 / SPINE</p>
          <h2 id="aether-spine-title">Career &amp; Stack</h2>
          <p className="aether-origin-sub aether-scene-lede">
            A decade of building full-stack applications, leading UI teams, and
            shipping maintainable production systems.
          </p>
        </div>

        <ol className="aether-spine-list" role="list">
          {experiences.map((exp, index) => (
            <li
              key={`${exp.company}-${exp.year}`}
              className="aether-shard aether-blade"
              data-side={index % 2 === 0 ? "left" : "right"}
              style={
                {
                  "--shard-index": index,
                  "--shatter-dir": index % 2 === 0 ? -1 : 1,
                } as React.CSSProperties
              }
            >
              <p className="aether-blade-dates">{exp.year}</p>
              <h3 className="aether-spine-company">{exp.company}</h3>
              <p className="aether-spine-role">{exp.title}</p>
              <p className="aether-spine-desc">{exp.description}</p>
            </li>
          ))}
        </ol>

        <div className="aether-spine-stack">
          <h3>Core Technologies</h3>
          <ul
            className="aether-stack-list"
            role="list"
            aria-label="Core technologies"
          >
            {topTechnologies.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Act 04 — Gravitational Convergence */}
      <section
        id="aether-converge"
        className="aether-scene aether-converge aether-scene-converge"
        data-act="04 / CONVERGE"
        aria-labelledby="aether-converge-title"
      >
        <div className="aether-converge-shell">
          <p className="aether-act-kicker">04 / CONVERGE</p>
          <h2 id="aether-converge-title">
            Hiring for a senior engineering role?
          </h2>
          <p className="aether-origin-sub aether-converge-lede">
            Tell me about the role, team, and technical direction. I bring
            hands-on full-stack architecture, UI leadership, and calm production
            delivery.
          </p>
          <div className="aether-converge-actions">
            <PrefetchLink className="aether-converge-cta" to="/contact">
              Get in touch
              <ArrowUpRight size={18} aria-hidden="true" />
            </PrefetchLink>
            <PrefetchLink className="studio-hero-link" to="/resume">
              View resume
              <ArrowRight size={16} aria-hidden="true" />
            </PrefetchLink>
          </div>
        </div>
      </section>
    </div>
  );
}
