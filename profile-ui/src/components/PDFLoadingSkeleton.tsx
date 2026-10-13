import { useTheme } from "@/theme/ThemeContext";
import { motion } from "framer-motion";

const PDFLoadingSkeleton = () => {
  const { colors } = useTheme();

  return (
    <motion.div
      className="w-full h-96 md:h-screen rounded-lg p-4 space-y-4"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        border: `1px solid ${colors.border}`,
      }}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      {/* PDF viewer outline skeleton */}
      <div className="space-y-3">
        <div
          className="h-12 rounded"
          style={{ backgroundColor: colors.border }}
        />
        <div
          className="h-64 md:h-96 rounded flex flex-col gap-2"
          style={{ backgroundColor: colors.border }}
        >
          <div
            className="h-full rounded"
            style={{ backgroundColor: colors.border }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default PDFLoadingSkeleton;
