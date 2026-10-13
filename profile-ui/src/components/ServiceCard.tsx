import { useState } from "react";
import { useTheme } from "@/theme/ThemeContext";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index?: number;
}

const ServiceCard = ({
  icon: Icon,
  title,
  description,
  index = 0,
}: ServiceCardProps) => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const scrollRef = useScrollReveal();

  return (
    <motion.div
      ref={scrollRef as unknown as React.Ref<HTMLDivElement>}
      className="p-6 md:p-8 rounded-xl transition-all border-l-4 overflow-hidden relative focus:ring-2 focus:ring-primary focus:outline-none"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        border: `2px solid ${colors.border}`,
        borderLeftColor: colors.primary,
        borderLeftWidth: "5px",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={title}
      tabIndex={0}
    >
      {/* Animated accent bar on hover */}
      <motion.div
        className="absolute top-0 left-0 h-1 bg-gradient-to-r"
        style={{
          backgroundImage: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
        }}
        initial={{ width: 0 }}
        animate={{ width: isHovered ? "100%" : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Icon container */}
      <motion.div
        className="mb-4 inline-block p-3 rounded-lg transition-all"
        style={{
          backgroundColor: `${colors.primary}15`,
        }}
        animate={{
          y: isHovered ? -8 : 0,
          rotate: isHovered ? 6 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        aria-hidden="true"
      >
        <Icon size={32} style={{ color: colors.primary }} />
      </motion.div>

      {/* Title */}
      <motion.h3
        className="text-xl font-bold mb-3 transition-colors"
        style={{
          color: isHovered ? colors.primary : colors.text,
          fontFamily: '"IBM Plex Mono", monospace',
        }}
        animate={{ letterSpacing: isHovered ? "0.5px" : "0px" }}
      >
        {title}
      </motion.h3>

      {/* Description */}
      <p
        style={{ color: colors.textSecondary }}
        className="text-sm leading-relaxed"
      >
        {description}
      </p>

      {/* Hover shadow effect */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          backgroundColor: `${colors.primary}05`,
        }}
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
};

export default ServiceCard;
