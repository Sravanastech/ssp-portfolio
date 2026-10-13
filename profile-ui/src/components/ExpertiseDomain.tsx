import { useTheme } from "@/theme/ThemeContext";
import EvidenceBadge from "./EvidenceBadge";

interface ExpertiseDomainProps {
  domain: string;
  skills: string[];
}

const ExpertiseDomain = ({ domain, skills }: ExpertiseDomainProps) => {
  const { colors } = useTheme();
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
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
