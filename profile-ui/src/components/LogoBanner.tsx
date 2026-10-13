import { motion } from "framer-motion";
import { useTheme } from "@/theme/ThemeContext";

const LogoBanner = () => {
  const { colors } = useTheme();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const logoVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
    },
  };

  const accentLineVariants = {
    hidden: { scaleX: 0 },
    visible: {
      scaleX: 1,
    },
  };

  const nameVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  const roleVariants = {
    hidden: { opacity: 0, letterSpacing: "-0.05em" },
    visible: {
      opacity: 1,
      letterSpacing: "0.1em",
    },
  };

  const hoverVariants = {
    hover: {
      filter: "drop-shadow(0 0 30px rgba(253, 185, 19, 0.8))",
      scale: 1.03,
    },
  };

  return (
    <motion.section
      className="w-full py-12 md:py-16 lg:py-20 relative overflow-hidden"
      style={{ backgroundColor: colors.background }}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Animated background accents */}
      <motion.div
        className="absolute top-0 left-0 w-96 h-96 rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors.primary}15, transparent 70%)`,
          filter: "blur(40px)",
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, 20, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-80 h-80 rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors.primary}10, transparent 70%)`,
          filter: "blur(40px)",
        }}
        animate={{
          x: [0, -30, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="max-w-5xl mx-auto px-4 relative z-10 flex flex-col items-center gap-6 md:gap-8">
        {/* Left accent line */}
        <motion.div
          className="absolute -left-4 md:-left-8 top-1/2 -translate-y-1/2 h-32 md:h-40 w-1.5 rounded-full"
          style={{ backgroundColor: colors.primary }}
          variants={accentLineVariants}
          transition={{ duration: 0.8, delay: 0.2 }}
        />

        {/* Logo */}
        <motion.div
          className="relative"
          variants={logoVariants}
          whileHover="hover"
          transition={{ duration: 0.7 }}
        >
          <motion.div className="relative" variants={hoverVariants}>
            <img
              src="/images/logo.webp"
              width="120"
              height="120"
              alt="Logo"
              className="h-24 w-24 md:h-32 md:w-32 lg:h-40 lg:w-40 object-contain"
              fetchPriority="high"
            />
            {/* Glow effect behind logo */}
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{
                backgroundColor: colors.primary,
                filter: "blur(30px)",
                opacity: 0,
              }}
              whileHover={{ opacity: 0.3 }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        </motion.div>

        {/* Name with top/bottom borders */}
        <motion.div
          className="text-center space-y-2"
          variants={nameVariants}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-center justify-center gap-4">
            <motion.div
              className="h-0.5 w-8 md:w-12"
              style={{ backgroundColor: colors.primary }}
              variants={accentLineVariants}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
            <span
              className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight block"
              style={{ color: colors.primary }}
            >
              Sravana S Parimi
            </span>
            <motion.div
              className="h-0.5 w-8 md:w-12"
              style={{ backgroundColor: colors.primary }}
              variants={accentLineVariants}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </div>

          {/* Animated underline */}
          <motion.div
            className="h-1 w-24 md:w-32 mx-auto rounded-full"
            style={{ backgroundColor: colors.primary }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "100%", opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          />
        </motion.div>

        {/* Role title with letter spacing animation */}
        <motion.div
          variants={roleVariants}
          className="text-center"
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p
            className="text-lg md:text-2xl lg:text-3xl font-bold"
            style={{ color: colors.textSecondary }}
          >
            Full Stack Engineer
          </p>
        </motion.div>

        {/* Right accent line */}
        <motion.div
          className="absolute -right-4 md:-right-8 top-1/2 -translate-y-1/2 h-32 md:h-40 w-1.5 rounded-full"
          style={{ backgroundColor: colors.primary }}
          variants={accentLineVariants}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
    </motion.section>
  );
};

export default LogoBanner;
