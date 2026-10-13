import { Link } from "react-router-dom";
import { useTheme } from "@/theme/ThemeContext";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  const { colors } = useTheme();

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm flex-wrap">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {item.path ? (
              <Link
                to={item.path}
                className="transition-colors hover:underline"
                style={{ color: colors.primary }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: colors.text }} aria-current="page">
                {item.label}
              </span>
            )}
            {index < items.length - 1 && (
              <ChevronRight size={16} style={{ color: colors.textSecondary }} />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
