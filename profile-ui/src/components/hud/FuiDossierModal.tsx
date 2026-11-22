import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { SiteContent } from "@/content/siteContentContext";
import PrefetchLink from "@/components/PrefetchLink";

export type CaseStudy = SiteContent["caseStudies"][number];

export interface FuiDossierModalProps {
  study: CaseStudy | null;
  index: number;
  onClose: () => void;
}

const NODE_WIDTH = 210;
const NODE_HEIGHT = 64;
const NODE_GAP = 56;
const PAD_X = 20;
const PAD_Y = 22;

function SystemArchitectureFlow({ study }: { study: CaseStudy }) {
  const steps = study.flow;
  const count = steps.length;
  const svgWidth =
    PAD_X * 2 + count * NODE_WIDTH + Math.max(0, count - 1) * NODE_GAP;
  const svgHeight = PAD_Y * 2 + NODE_HEIGHT;
  const midY = PAD_Y + NODE_HEIGHT / 2;

  return (
    <div className="fui-dossier-arch">
      <div className="fui-section-label">SYSTEM_ARCHITECTURE // FLOW</div>
      <svg
        className="fui-arch-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-labelledby="fui-arch-svg-title"
      >
        <title id="fui-arch-svg-title">{study.name} conceptual workflow</title>
        {steps.map((step, i) => {
          const x = PAD_X + i * (NODE_WIDTH + NODE_GAP);
          const y = PAD_Y;
          const nextX = x + NODE_WIDTH + NODE_GAP;
          const lineStartX = x + NODE_WIDTH + 4;
          const lineEndX = nextX - 12;
          const chamfer = 10;
          const points = [
            `${x + chamfer},${y}`,
            `${x + NODE_WIDTH},${y}`,
            `${x + NODE_WIDTH},${y + NODE_HEIGHT - chamfer}`,
            `${x + NODE_WIDTH - chamfer},${y + NODE_HEIGHT}`,
            `${x},${y + NODE_HEIGHT}`,
            `${x},${y + chamfer}`,
          ].join(" ");

          return (
            <g key={step} className="fui-arch-node">
              <polygon
                points={points}
                fill="var(--fui-surface-elevated, rgba(255, 255, 255, 0.04))"
                stroke="var(--fui-accent, currentColor)"
                strokeWidth="1.25"
              />
              <text
                x={x + 12}
                y={y + 18}
                fill="var(--fui-accent, currentColor)"
                fontSize="10"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                letterSpacing="0.12em"
              >
                {`NODE // 0${i + 1}`}
              </text>
              <text
                x={x + NODE_WIDTH / 2}
                y={y + 42}
                textAnchor="middle"
                fill="currentColor"
                fontSize="12.5"
                fontWeight="600"
              >
                {step}
              </text>
              {i < count - 1 ? (
                <g className="fui-arch-edge" aria-hidden="true">
                  <line
                    x1={lineStartX}
                    y1={midY}
                    x2={lineEndX}
                    y2={midY}
                    stroke="var(--fui-accent, currentColor)"
                    strokeWidth="1.25"
                  />
                  <polygon
                    points={`${lineEndX},${midY - 5} ${lineEndX + 9},${midY} ${lineEndX},${midY + 5}`}
                    fill="var(--fui-accent, currentColor)"
                  />
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      <p className="fui-arch-note">{study.flowNote}</p>
    </div>
  );
}

export function FuiDossierModal({
  study,
  index,
  onClose,
}: FuiDossierModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!study) return;

    closeBtnRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [study, onClose]);

  if (!study) return null;

  const projectCode = `PRJ // ${String(index + 1).padStart(2, "0")}`;

  return (
    <div
      className="fui-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="fui-dossier"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fui-dossier-title"
      >
        <header className="fui-dossier-header">
          <div className="fui-dossier-meta">
            <span className="fui-dossier-code">{projectCode}</span>
            <p className="fui-dossier-org">
              {study.organization} · {study.role}
            </p>
            <h2 id="fui-dossier-title" className="fui-dossier-title">
              {study.name}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="fui-dossier-close"
            style={{ minHeight: 44, minWidth: 44 }}
            onClick={onClose}
            aria-label="Close technical dossier"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="fui-dossier-body">
          <SystemArchitectureFlow study={study} />

          <div className="fui-dossier-grid">
            <section className="fui-dossier-block">
              <h3 className="fui-section-label">Problem</h3>
              <p>{study.problem}</p>
            </section>
            <section className="fui-dossier-block">
              <h3 className="fui-section-label">My Contribution</h3>
              <p>{study.contribution}</p>
            </section>
            <section className="fui-dossier-block">
              <h3 className="fui-section-label">Outcome</h3>
              <p>{study.outcome}</p>
            </section>
          </div>
        </div>

        <footer className="fui-dossier-footer">
          <ul className="fui-dossier-tags" aria-label="Technology stack">
            {study.technologies.map((tech) => (
              <li key={tech} className="fui-tag">
                {tech}
              </li>
            ))}
          </ul>
          <PrefetchLink
            to={`/work/${study.slug}`}
            className="fui-btn-primary"
            onClick={onClose}
          >
            Open Full Case Study
          </PrefetchLink>
        </footer>
      </div>
    </div>
  );
}

export default FuiDossierModal;
