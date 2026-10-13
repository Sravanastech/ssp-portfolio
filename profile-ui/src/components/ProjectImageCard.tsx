import { useTheme } from "@/theme/ThemeContext";

interface ProjectImageCardProps {
  category: string;
  projectName?: string;
}

const ProjectImageCard = ({ category }: ProjectImageCardProps) => {
  const { colors } = useTheme();

  const categoryStyles = {
    Frontend: {
      gradient1: "#FF6B6B",
      gradient2: "#FFE66D",
      icon: "⚛️",
      description: "React & UI",
    },
    "Full-Stack": {
      gradient1: "#4ECDC4",
      gradient2: "#44A08D",
      icon: "🔗",
      description: "End-to-End",
    },
    Backend: {
      gradient1: "#6C5CE7",
      gradient2: "#A29BFE",
      icon: "⚙️",
      description: "Services & APIs",
    },
    Leadership: {
      gradient1: "#FD79A8",
      gradient2: "#FDCB6E",
      icon: "👥",
      description: "Mentorship",
    },
    default: {
      gradient1: colors.primary,
      gradient2: colors.secondary,
      icon: "✨",
      description: "Innovation",
    },
  };

  const style =
    categoryStyles[category as keyof typeof categoryStyles] ||
    categoryStyles.default;

  return (
    <div
      className="h-48 rounded-t-lg overflow-hidden relative group cursor-pointer"
      style={{
        background: `linear-gradient(135deg, ${style.gradient1} 0%, ${style.gradient2} 100%)`,
        position: "relative",
      }}
    >
      {/* Animated background elements */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
          animation: "pulse 4s ease-in-out infinite",
        }}
      />

      {/* Main content */}
      <div className="h-full flex flex-col items-center justify-center relative z-10 group-hover:scale-110 transition-transform duration-300">
        {/* Icon */}
        <div
          className="text-6xl mb-3 group-hover:scale-125 transition-transform duration-300"
          style={{
            textShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          }}
        >
          {style.icon}
        </div>

        {/* Text */}
        <p className="text-white font-bold text-sm text-center opacity-90">
          {style.description}
        </p>
      </div>

      {/* Floating elements */}
      <div
        className="absolute top-4 right-4 w-12 h-12 rounded-full opacity-30"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          animation: "float 6s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-4 left-4 w-8 h-8 rounded-full opacity-30"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          animation: "float 4s ease-in-out infinite 1s",
        }}
      />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default ProjectImageCard;
