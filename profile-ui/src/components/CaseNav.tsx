import { useEffect, useRef, useState } from "react";

interface CaseNavProps {
  label: string;
  items: { id: string; name: string }[];
}

/** Sticky jump chips for the case studies with scroll-position highlight. */
export default function CaseNav({ label, items }: CaseNavProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    const update = () => {
      // Active = last section whose top has passed the sticky header + chip bar.
      const line = window.innerHeight * 0.3;
      let current: string | null = null;
      for (const el of sections) {
        if (el.getBoundingClientRect().top <= line) current = el.id;
      }
      setActiveId(current);
    };
    const observer = new IntersectionObserver(update, {
      rootMargin: "0px 0px -60% 0px",
      threshold: [0, 1],
    });
    sections.forEach((el) => observer.observe(el));
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, [items]);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>("[aria-current]");
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    // Scroll only the chip row, never the page.
    const target =
      active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, target) });
  }, [activeId]);

  return (
    <nav ref={navRef} aria-label={label} className="studio-case-nav">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={activeId === item.id ? "location" : undefined}
        >
          {item.name}
        </a>
      ))}
    </nav>
  );
}
