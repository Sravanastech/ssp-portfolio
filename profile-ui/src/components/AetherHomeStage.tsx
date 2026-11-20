import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useSiteContent } from "@/content/siteContentContext";
import PrefetchLink from "@/components/PrefetchLink";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia?.(REDUCED_MOTION)?.matches ?? false;
  } catch {
    return false;
  }
}

interface SceneMeta {
  id: string;
  label: string;
}

/**
 * Aether Take 3 — High-Budget Movie Title Sequence & Apple Keynote Sticky Scroll.
 *
 * A single pinned Cinemascope viewport (`position: sticky`) scrubs cleanly through
 * laser-aligned, one-at-a-time film title cards as the visitor scrolls:
 *   01. Opening Title Card (Name + Role)
 *   02. The Thesis (Headline + Bio + Actions)
 *   03–07. Featured Productions (5 real case studies, one full-screen frame each)
 *   08. Filmography / End-Credits Roll (Two-column classic Hollywood credit alignment)
 *   09. Finale / Next Chapter (Closing CTA)
 *
 * Zero WebGL, zero external animation libraries, zero React re-renders on scroll.
 */
export default function AetherHomeStage(): React.ReactElement {
  const { profile, caseStudies, experiences } = useSiteContent();
  const trackRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<(HTMLElement | null)[]>([]);
  const tickRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeLabelRef = useRef<HTMLSpanElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const scenes: SceneMeta[] = useMemo(
    () => [
      { id: "scene-opening", label: "01 · Opening" },
      { id: "scene-thesis", label: "02 · Craft" },
      ...caseStudies.map((study, idx) => ({
        id: `scene-work-${study.slug}`,
        label: `${String(idx + 3).padStart(2, "0")} · ${study.organization}`,
      })),
      {
        id: "scene-credits",
        label: `${String(caseStudies.length + 3).padStart(2, "0")} · Credits`,
      },
      {
        id: "scene-finale",
        label: `${String(caseStudies.length + 4).padStart(2, "0")} · Finale`,
      },
    ],
    [caseStudies],
  );

  const totalScenes = scenes.length;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof window === "undefined") return;

    const nodes = sceneRefs.current.filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return;

    const updateActiveTick = (activeIndex: number) => {
      if (activeLabelRef.current && scenes[activeIndex]) {
        activeLabelRef.current.textContent = scenes[activeIndex].label;
      }
      tickRefs.current.forEach((btn, idx) => {
        if (!btn) return;
        const active = idx === activeIndex;
        btn.dataset.active = active ? "true" : "false";
        if (active) btn.setAttribute("aria-current", "step");
        else btn.removeAttribute("aria-current");
      });
    };

    if (prefersReducedMotion()) {
      nodes.forEach((node) => {
        node.style.opacity = "1";
        node.style.transform = "none";
        node.style.filter = "none";
        node.style.pointerEvents = "auto";
        node.dataset.active = "true";
      });
      updateActiveTick(0);
      return;
    }

    let frame = 0;

    const flush = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));

      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
      }

      // Map global progress [0..1] onto scene index [0..totalScenes - 1]
      const exactPos = progress * (totalScenes - 1);
      const nearest = Math.round(exactPos);
      updateActiveTick(nearest);

      nodes.forEach((node, idx) => {
        // delta: 0 = dead-center in focus; negative = upcoming; positive = exiting
        const delta = exactPos - idx;
        const absDelta = Math.abs(delta);

        if (absDelta >= 0.92) {
          node.style.opacity = "0";
          node.style.visibility = "hidden";
          node.style.pointerEvents = "none";
          node.dataset.active = "false";
          return;
        }

        // Smooth bell curve: holds razor-sharp at 1.0 within |delta| <= 0.28,
        // then smoothly dissolves out to 0 at |delta| = 0.92.
        const hold = 0.26;
        const fade =
          absDelta <= hold
            ? 1
            : Math.max(0, 1 - (absDelta - hold) / (0.92 - hold));
        const eased = fade * fade * (3 - 2 * fade); // smoothstep

        // Subtle Z-depth cinema drift: upcoming starts slightly recessed (0.95),
        // locked scene is 1.00, exiting scene gently drifts toward lens (1.05).
        const scale = 1 + delta * 0.055;
        const translateY = -delta * 26;
        const blur = (1 - eased) * 7;

        node.style.visibility = "visible";
        node.style.opacity = eased.toFixed(4);
        node.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
        node.style.filter = blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : "none";
        const isCurrent = absDelta < 0.45;
        node.style.pointerEvents = isCurrent ? "auto" : "none";
        node.dataset.active = isCurrent ? "true" : "false";
      });
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
  }, [scenes, totalScenes]);

  const jumpToScene = (index: number) => {
    const track = trackRef.current;
    if (!track || typeof window === "undefined") return;
    if (prefersReducedMotion()) {
      sceneRefs.current[index]?.scrollIntoView({ behavior: "auto" });
      return;
    }
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const scrollable = Math.max(1, track.offsetHeight - window.innerHeight);
    const targetY =
      trackTop + (index / Math.max(1, totalScenes - 1)) * scrollable;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  return (
    <div
      className="aether-film"
      ref={trackRef}
      style={{ "--scene-count": totalScenes } as React.CSSProperties}
    >
      {/* Subtle fixed matte vignette + micro film grain (pointer-events: none) */}
      <div className="aether-film-vignette" aria-hidden="true" />
      <div className="aether-film-grain" aria-hidden="true" />

      {/* Pinned Cinemascope Viewport */}
      <div className="aether-stage-pin">
        {/* Top/bottom subtle letterbox hairlines */}
        <div className="aether-frame-top" aria-hidden="true" />
        <div className="aether-frame-bottom" aria-hidden="true" />

        {/* SCENE 01 — OPENING TITLE CARD */}
        <section
          id="scene-opening"
          ref={(el) => {
            sceneRefs.current[0] = el;
          }}
          className="aether-card aether-card--opening"
          aria-labelledby="aether-opening-title"
        >
          <p className="aether-kicker">A PORTFOLIO BY</p>
          <h1 id="aether-opening-title" className="aether-display">
            {profile.name}
          </h1>
          <div className="aether-rule" aria-hidden="true" />
          <p className="aether-subtitle">
            {profile.role} · {profile.employer} · {profile.location}
          </p>
          <p className="aether-scroll-cue" aria-hidden="true">
            Scroll to play sequence
          </p>
        </section>

        {/* SCENE 02 — THE THESIS */}
        <section
          id="scene-thesis"
          ref={(el) => {
            sceneRefs.current[1] = el;
          }}
          className="aether-card aether-card--thesis"
          aria-labelledby="aether-thesis-title"
        >
          <p className="aether-kicker">
            02 / THE CRAFT · SINCE {profile.careerStartYear}
          </p>
          <h2 id="aether-thesis-title" className="aether-headline">
            {profile.headline}
          </h2>
          <p className="aether-synopsis">{profile.description}</p>
          <div className="aether-actions">
            <PrefetchLink to="/work" className="aether-cta">
              Explore selected work
              <ArrowUpRight size={17} aria-hidden="true" />
            </PrefetchLink>
            <PrefetchLink to="/contact" className="aether-ghost-link">
              Get in touch
              <ArrowRight size={16} aria-hidden="true" />
            </PrefetchLink>
          </div>
        </section>

        {/* SCENES 03–07 — FEATURED PRODUCTIONS (5 REAL CASE STUDIES) */}
        {caseStudies.map((study, idx) => (
          <article
            key={study.id}
            id={`scene-work-${study.slug}`}
            ref={(el) => {
              sceneRefs.current[idx + 2] = el;
            }}
            className="aether-card aether-card--feature"
            aria-labelledby={`aether-work-${study.id}`}
          >
            <p className="aether-kicker">
              FEATURED WORK {String(idx + 1).padStart(2, "0")} /{" "}
              {String(caseStudies.length).padStart(2, "0")} ·{" "}
              {study.organization}
            </p>
            <h2 id={`aether-work-${study.id}`} className="aether-feature-title">
              <PrefetchLink to={`/work/${study.slug}`}>
                {study.name}
              </PrefetchLink>
            </h2>
            <p className="aether-feature-role">{study.role}</p>
            <div className="aether-rule" aria-hidden="true" />
            <p className="aether-synopsis">{study.summary}</p>
            <ul
              className="aether-tech-credits"
              role="list"
              aria-label={`${study.name} technologies`}
            >
              {study.technologies.slice(0, 6).map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
            <div className="aether-actions">
              <PrefetchLink to={`/work/${study.slug}`} className="aether-cta">
                Read case study
                <ArrowUpRight size={17} aria-hidden="true" />
              </PrefetchLink>
            </div>
          </article>
        ))}

        {/* SCENE 08 — CLASSIC HOLLYWOOD END-CREDITS ROLL (CAREER FILMOGRAPHY) */}
        <section
          id="scene-credits"
          ref={(el) => {
            sceneRefs.current[caseStudies.length + 2] = el;
          }}
          className="aether-card aether-card--credits"
          aria-labelledby="aether-credits-title"
        >
          <p className="aether-kicker">CAREER CREDITS</p>
          <h2 id="aether-credits-title" className="aether-credits-heading">
            Production History
          </h2>
          <ol className="aether-credits-roll" role="list">
            {experiences.map((exp) => (
              <li key={`${exp.company}-${exp.year}`}>
                <span className="aether-credit-left">
                  <span className="aether-credit-role">{exp.title}</span>
                  <span className="aether-credit-year">{exp.year}</span>
                </span>
                <span className="aether-credit-right">{exp.company}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* SCENE 09 — FINALE / NEXT CHAPTER */}
        <section
          id="scene-finale"
          ref={(el) => {
            sceneRefs.current[caseStudies.length + 3] = el;
          }}
          className="aether-card aether-card--finale"
          aria-labelledby="aether-finale-title"
        >
          <p className="aether-kicker">NEXT CHAPTER</p>
          <h2 id="aether-finale-title" className="aether-display">
            Hiring for a senior engineering role?
          </h2>
          <div className="aether-rule" aria-hidden="true" />
          <p className="aether-synopsis">
            Full-stack architecture, UI leadership, and calm production delivery
            in React, TypeScript, Java, and Spring Boot.
          </p>
          <div className="aether-actions">
            <PrefetchLink to="/contact" className="aether-cta">
              Get in touch
              <ArrowUpRight size={17} aria-hidden="true" />
            </PrefetchLink>
            <PrefetchLink to="/resume" className="aether-ghost-link">
              View resume
              <ArrowRight size={16} aria-hidden="true" />
            </PrefetchLink>
          </div>
        </section>

        {/* Bottom-center Cinema Scrubber Timeline */}
        <nav className="aether-scrubber" aria-label="Title sequence chapters">
          <span className="aether-scrubber-label" ref={activeLabelRef}>
            {scenes[0]?.label}
          </span>
          <div className="aether-scrubber-track" aria-hidden="true">
            <div className="aether-scrubber-fill" ref={progressBarRef} />
          </div>
          <div className="aether-scrubber-ticks">
            {scenes.map((scene, idx) => (
              <button
                key={scene.id}
                ref={(el) => {
                  tickRefs.current[idx] = el;
                }}
                type="button"
                className="aether-tick"
                data-active={idx === 0 ? "true" : "false"}
                aria-current={idx === 0 ? "step" : undefined}
                aria-label={`Jump to ${scene.label}`}
                onClick={() => jumpToScene(idx)}
              >
                <span className="aether-tick-dot" aria-hidden="true" />
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
