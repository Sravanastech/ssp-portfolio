import { useEffect, useRef } from "react";

export const useScrollReveal = () => {
  const ref = useRef<HTMLElement | null>(null);
  const hasBeenVisible = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasBeenVisible.current) {
          hasBeenVisible.current = true;
          entry.target.classList.add("animate-fade-up");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );

    observer.observe(element);
    return () => {
      observer.unobserve(element);
    };
  }, []);

  return ref;
};
