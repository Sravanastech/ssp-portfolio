import { useState, useEffect } from "react";
import { cv } from "@/theme/cssVars";
import { ChevronUp } from "lucide-react";

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        scrollToTop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 p-3 rounded-full shadow-lg transition-[opacity,translate,scale] duration-300 ease-out starting:opacity-0 starting:translate-y-5 hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
      style={{
        backgroundColor: cv.primary,
        color: cv.accent,
      }}
      aria-label="Scroll to top"
    >
      <ChevronUp size={24} />
    </button>
  );
};

export default BackToTop;
