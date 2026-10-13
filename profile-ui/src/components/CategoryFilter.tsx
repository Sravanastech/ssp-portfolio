import { useTheme } from "@/theme/ThemeContext";

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

const CategoryFilter = ({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) => {
  const { colors } = useTheme();

  return (
    <div
      className="mb-8 flex flex-wrap gap-2"
      role="group"
      aria-label="Filter projects by category"
    >
      <button
        onClick={() => onCategoryChange(null)}
        className={`px-4 py-2 rounded-lg font-semibold transition-all border ${
          activeCategory === null
            ? "ring-2 ring-offset-2 ring-primary"
            : "opacity-60 hover:opacity-100"
        }`}
        style={{
          backgroundColor:
            activeCategory === null ? colors.primary : "transparent",
          color: activeCategory === null ? colors.accent : colors.text,
          borderColor: colors.border,
        }}
        aria-pressed={activeCategory === null}
      >
        All Projects
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`px-4 py-2 rounded-lg font-semibold transition-all border ${
            activeCategory === category
              ? "ring-2 ring-offset-2 ring-primary"
              : "opacity-60 hover:opacity-100"
          }`}
          style={{
            backgroundColor:
              activeCategory === category ? colors.primary : "transparent",
            color: activeCategory === category ? colors.accent : colors.text,
            borderColor: colors.border,
          }}
          aria-pressed={activeCategory === category}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
