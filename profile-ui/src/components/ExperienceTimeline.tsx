import { useId, useState } from "react";
import { cv } from "@/theme/cssVars";
import { ChevronDown } from "lucide-react";

interface TimelineItem {
  year: string;
  title: string;
  company: string;
  description: string;
}

interface ExperienceTimelineProps {
  items: TimelineItem[];
}

const ExperienceTimeline = ({ items }: ExperienceTimelineProps) => {
  const timelineId = useId();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  return (
    <div className="border-t" style={{ borderColor: cv.border }}>
      {items.map((item, idx) => (
        <div key={idx} className="border-b" style={{ borderColor: cv.border }}>
          <button
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            aria-expanded={expandedIdx === idx}
            aria-controls={`${timelineId}-${idx}`}
            className="w-full text-left py-7"
            style={{
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            <div className="flex justify-between items-start gap-6">
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: cv.primary }}
                >
                  {item.year}
                </p>
                <h3
                  className="text-lg font-bold mt-1"
                  style={{ color: cv.text }}
                >
                  {item.title}
                </h3>
                <p className="text-sm mt-1" style={{ color: cv.textSecondary }}>
                  {item.company}
                </p>
              </div>
              <ChevronDown
                size={20}
                aria-hidden="true"
                className="shrink-0 mt-2"
                style={{
                  color: cv.primary,
                  transform:
                    expandedIdx === idx ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 0.3s ease",
                }}
              />
            </div>
          </button>

          <div
            id={`${timelineId}-${idx}`}
            hidden={expandedIdx !== idx}
            className="pb-8 max-w-3xl text-lg"
            style={{
              backgroundColor: cv.background,
              color: cv.textSecondary,
              lineHeight: "1.6",
            }}
          >
            {item.description}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExperienceTimeline;
