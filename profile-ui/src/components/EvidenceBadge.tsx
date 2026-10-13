import { useTheme } from "@/theme/ThemeContext";

interface EvidenceBadgeProps {
  label: string;
  value?: string;
  className?: string;
}

const EvidenceBadge = ({ label, value, className }: EvidenceBadgeProps) => {
  const { colors } = useTheme();

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${className || ""}`}
      style={{
        backgroundColor: colors.surface,
        color: colors.text,
      }}
    >
      <span>{label}</span>
      {value && <span className="font-semibold">{value}</span>}
    </div>
  );
};

export default EvidenceBadge;
