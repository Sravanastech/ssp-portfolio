import { cv } from "@/theme/cssVars";
import EvidenceBadge from "./EvidenceBadge";

interface ExpertiseDomainProps {
  domain: string;
  skills: string[];
}

const ExpertiseDomain = ({ domain, skills }: ExpertiseDomainProps) => {
  return (
    <div>
      <h3 className="text-lg font-bold mb-4" style={{ color: cv.text }}>
        {domain}
      </h3>
      <div className="flex flex-wrap gap-3">
        {skills.map((skill) => (
          <EvidenceBadge key={skill} label={skill} />
        ))}
      </div>
    </div>
  );
};

export default ExpertiseDomain;
