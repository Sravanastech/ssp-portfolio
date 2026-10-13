import { useState } from "react";
import { useTheme } from "@/theme/ThemeContext";
import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface StatItem {
  number: string;
  label: string;
}

interface StatsCardProps {
  stats: StatItem[];
}

const StatsCard = ({ stats }: StatsCardProps) => {
  const { colors } = useTheme();
  const scrollRef = useScrollReveal();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  } as const;

  return (
    <motion.div
      ref={scrollRef as unknown as React.Ref<HTMLDivElement>}
      id="stats-container"
      className="grid grid-cols-3 gap-4 md:gap-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="region"
      aria-label="Key statistics"
    >
      {stats.map((stat, idx) => (
        <motion.div
          key={idx}
          className="text-center p-6 md:p-8 rounded-lg transition-all relative group cursor-default"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            border: `1px solid ${colors.border}`,
          }}
          variants={itemVariants}
          onMouseEnter={() => setHoveredIdx(idx)}
          onMouseLeave={() => setHoveredIdx(null)}
          whileHover={{
            y: -8,
            boxShadow: `0 20px 40px ${colors.shadow}`,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          role="article"
          aria-label={`${stat.number} ${stat.label}`}
        >
          {/* Top accent line on hover */}
          <motion.div
            className="absolute top-0 left-0 h-1 bg-gradient-to-r rounded-t-lg"
            style={{
              backgroundImage: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
            }}
            initial={{ width: 0 }}
            animate={{ width: hoveredIdx === idx ? "100%" : 0 }}
            transition={{ duration: 0.3 }}
          />

          <motion.div
            className="text-3xl md:text-5xl font-bold mb-2"
            style={{
              color: colors.primary,
              fontFamily: '"IBM Plex Mono", monospace',
            }}
            animate={{ scale: hoveredIdx === idx ? 1.1 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            {stat.number}
          </motion.div>

          <motion.div
            style={{ color: colors.textSecondary }}
            className="text-sm md:text-base font-medium"
            animate={{
              letterSpacing: hoveredIdx === idx ? "0.5px" : "0px",
            }}
          >
            {stat.label}
          </motion.div>

          {/* Background glow on hover */}
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${colors.primary}10, transparent)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: hoveredIdx === idx ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default StatsCard;
