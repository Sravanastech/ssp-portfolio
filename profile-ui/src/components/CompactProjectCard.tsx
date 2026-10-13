import { useRef } from "react";
import { useTheme } from "@/theme/ThemeContext";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import type { WorkProject } from "@/data/workProjects";

interface CompactProjectCardProps {
  project: WorkProject;
  onSelect?: () => void;
}

const CompactProjectCard = ({ project, onSelect }: CompactProjectCardProps) => {
  const { colors } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const handlers = useKeyboardNav(cardRef, { onClick: onSelect });

  return (
    <div
      ref={cardRef}
      className="border rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow focus:ring-2 focus:ring-primary focus:outline-none"
      style={{ borderColor: colors.border }}
      role="article"
      aria-label={`${project.domain} project overview`}
      tabIndex={0}
      {...handlers}
    >
      {/* Domain Heading */}
      <h3
        className="text-lg font-semibold mb-4"
        style={{ color: colors.primary }}
      >
        {project.domain}
      </h3>

      {/* Technology Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {project.technologies.map((tech, idx) => (
          <span
            key={idx}
            className="font-mono text-xs px-2 py-1 rounded"
            style={{ backgroundColor: colors.surface, color: colors.text }}
          >
            {tech}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
        {project.description}
      </p>

      {/* Outcomes */}
      {project.outcomes.length > 0 && (
        <ul className="space-y-2">
          {project.outcomes.slice(0, 3).map((outcome, idx) => (
            <li
              key={`${idx}-${outcome.label}`}
              className={`flex items-start gap-2 text-sm ${
                idx === 0 ? "font-bold" : idx === 2 ? "opacity-60" : ""
              }`}
              style={{
                color: idx === 0 ? colors.text : colors.textSecondary,
              }}
            >
              <span style={{ color: colors.border, marginTop: "0.25rem" }}>
                •
              </span>
              <span>{outcome.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CompactProjectCard;
