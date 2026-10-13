import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/themeConfig";

const codeSnippet = `async function fetchUserData(id: string) {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}`;

export const FullStackDataFlow = () => {
  const { colors } = useTheme();
  const [displayedCode, setDisplayedCode] = useState("");
  const [isAnimating, setIsAnimating] = useState(true);

  // Type code animation
  useEffect(() => {
    if (!isAnimating) return;

    let index = 0;
    const interval = setInterval(() => {
      if (index <= codeSnippet.length) {
        setDisplayedCode(codeSnippet.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setDisplayedCode("");
          setIsAnimating(true);
        }, 3000); // Pause before restarting
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isAnimating]);

  // Respect prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion) {
    return (
      <div
        className="relative h-full min-h-96 flex items-center justify-center rounded-lg border"
        style={{
          backgroundColor: `${colors.primary}08`,
          borderColor: colors.border,
        }}
      >
        <pre
          className="p-6 text-sm overflow-x-auto font-mono"
          style={{ color: colors.text }}
        >
          {codeSnippet}
        </pre>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-96">
      {/* Grid background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10"
        style={{ backgroundColor: `${colors.primary}05` }}
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={colors.border}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Main container */}
      <div className="relative h-full p-6 md:p-8 flex flex-col gap-8">
        {/* Three-layer visualization */}
        <div className="flex flex-col gap-6 flex-1">
          {/* CLIENT Layer */}
          <motion.div
            className="relative rounded-lg border-2 p-4 md:p-6"
            style={{
              borderColor: colors.primary,
              backgroundColor: `${colors.primary}08`,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="text-xs font-bold mb-3 tracking-wider"
              style={{ color: colors.primary }}
            >
              CLIENT LAYER
            </div>
            <pre
              className="text-xs md:text-sm font-mono overflow-x-auto"
              style={{
                color: colors.text,
                fontFamily: '"IBM Plex Mono", monospace',
              }}
            >
              <span style={{ color: colors.primary }}>async </span>
              <span style={{ color: colors.secondary }}>function</span>
              {" fetchUserData("}
              <span style={{ color: `${colors.primary}dd` }}>id</span>
              {") {"}
              {"\n  "}
              <span style={{ color: colors.secondary }}>const</span>
              {" response = "}
              <span style={{ color: colors.primary }}>await</span>{" "}
              <span style={{ color: colors.secondary }}>fetch</span>
              {"(`/api/users/${"}
              <span style={{ color: `${colors.primary}dd` }}>id</span>
              {"}`);"}
              {displayedCode && displayedCode.includes("return") && (
                <>
                  {"\n  "}
                  <span style={{ color: colors.secondary }}>return</span>
                  {" response."}
                  <span style={{ color: colors.primary }}>json</span>
                  {"();"}
                </>
              )}
            </pre>
          </motion.div>

          {/* Request Arrow */}
          <AnimatedDataFlow
            direction="down"
            colors={colors}
            label="REQUEST"
            delay={1.5}
          />

          {/* SERVER Layer */}
          <motion.div
            className="relative rounded-lg border-2 p-4 md:p-6"
            style={{
              borderColor: colors.secondary,
              backgroundColor: `${colors.secondary}08`,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div
              className="text-xs font-bold mb-3 tracking-wider"
              style={{ color: colors.secondary }}
            >
              API SERVER
            </div>
            <div className="text-xs md:text-sm font-mono space-y-1">
              <div style={{ color: colors.text }}>
                <span style={{ color: colors.secondary }}>GET</span>
                {" /api/users/:id"}
              </div>
              <div style={{ color: colors.textSecondary }}>
                Validate • Query • Process
              </div>
            </div>
          </motion.div>

          {/* Processing Arrow */}
          <AnimatedDataFlow
            direction="down"
            colors={colors}
            label="EXECUTE"
            delay={2}
          />

          {/* DATABASE Layer */}
          <motion.div
            className="relative rounded-lg border-2 p-4 md:p-6"
            style={{
              borderColor: colors.primary,
              backgroundColor: `${colors.primary}08`,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div
              className="text-xs font-bold mb-3 tracking-wider"
              style={{ color: colors.primary }}
            >
              DATABASE
            </div>
            <div className="text-xs md:text-sm font-mono">
              <span style={{ color: colors.secondary }}>SELECT</span>
              {" * FROM users WHERE id = "}
              <span style={{ color: `${colors.primary}dd` }}>?</span>
            </div>
          </motion.div>

          {/* Response Arrow */}
          <AnimatedDataFlow
            direction="up"
            colors={colors}
            label="RESPONSE"
            delay={2.5}
          />
        </div>

        {/* Result indicator */}
        <motion.div
          className="text-center text-xs md:text-sm font-mono"
          style={{ color: colors.primary }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.2, duration: 0.8 }}
        >
          <span style={{ color: colors.success }}>✓</span>{" "}
          <span>
            Complete request/response cycle demonstrates full-stack thinking
          </span>
        </motion.div>
      </div>
    </div>
  );
};

interface AnimatedDataFlowProps {
  direction: "up" | "down";
  colors: ThemeColors;
  label: string;
  delay: number;
}

const AnimatedDataFlow = ({
  direction,
  colors,
  label,
  delay,
}: AnimatedDataFlowProps) => {
  const yStart = direction === "down" ? -20 : 20;
  const yEnd = direction === "down" ? 20 : -20;

  return (
    <motion.div
      className="relative flex justify-center items-center h-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
    >
      {/* Arrow line */}
      <motion.div
        className="absolute w-1 h-full rounded-full"
        style={{
          background: `linear-gradient(${direction === "down" ? "to bottom" : "to top"}, ${colors.primary}, transparent)`,
        }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay, duration: 0.8 }}
      />

      {/* Animated data packet */}
      <motion.div
        className="absolute w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold"
        style={{
          borderColor: colors.primary,
          backgroundColor: colors.primary,
          color: colors.accent,
        }}
        initial={{
          y: yStart,
          opacity: 0,
        }}
        animate={{
          y: yEnd,
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          delay,
          duration: 1.5,
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 3,
        }}
      >
        •
      </motion.div>

      {/* Label */}
      <span
        className="absolute text-xs font-bold tracking-wider"
        style={{
          color: colors.primary,
          right: direction === "down" ? "-60px" : "auto",
          left: direction === "up" ? "-60px" : "auto",
          opacity: 0.7,
        }}
      >
        {label}
      </span>
    </motion.div>
  );
};
