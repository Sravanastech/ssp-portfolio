import { Link } from "react-router-dom";
import { cv } from "@/theme/cssVars";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm flex-wrap">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {item.path ? (
              <Link
                to={item.path}
                className="-my-3 inline-flex min-h-11 items-center transition-colors hover:underline"
                style={{ color: cv.primary }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: cv.text }} aria-current="page">
                {item.label}
              </span>
            )}
            {index < items.length - 1 && (
              <ChevronRight size={16} style={{ color: cv.textSecondary }} />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
