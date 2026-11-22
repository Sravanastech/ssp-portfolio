import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSiteContent } from "@/content/siteContentContext";
import { useParadigm } from "@/theme/ParadigmContext";
import { useTheme } from "@/theme/theme-context";

export interface FuiCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  fuiTheme: "void" | "cleanroom";
  onOpenAppearance: () => void;
  onSelectStudy: (slug: string) => void;
}

interface PaletteCommand {
  id: string;
  label: string;
  category: string;
  keywords: string;
  badge?: string;
  run: () => void;
}

function FuiCommandPaletteDialog({
  onClose,
  fuiTheme,
  onOpenAppearance,
  onSelectStudy,
}: Omit<FuiCommandPaletteProps, "open">) {
  const { profile, caseStudies } = useSiteContent();
  const { setParadigm } = useParadigm();
  const { setTheme } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [selectedTech, setSelectedTech] = useState<string>("ALL");
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  const techFilters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const study of caseStudies) {
      for (const tech of study.technologies) {
        counts.set(tech, (counts.get(tech) ?? 0) + 1);
      }
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 7)
      .map(([tech]) => tech);
    return ["ALL", ...sorted];
  }, [caseStudies]);

  const tokens = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );

  const filteredStudies = useMemo(() => {
    return caseStudies.filter((study) => {
      if (
        selectedTech !== "ALL" &&
        !study.technologies.includes(selectedTech)
      ) {
        return false;
      }
      if (tokens.length === 0) return true;
      const haystack = [
        study.name,
        study.organization,
        study.role,
        study.summary,
        ...study.technologies,
      ]
        .join(" ")
        .toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [caseStudies, selectedTech, tokens]);

  const commands = useMemo<PaletteCommand[]>(() => {
    const nextThemeLabel = fuiTheme === "void" ? "CLEANROOM" : "VOID";
    const allCommands: PaletteCommand[] = [
      {
        id: "toggle-fui-theme",
        label: `Switch FUI Theme (${nextThemeLabel})`,
        category: "THEME",
        keywords: `theme void cleanroom light dark ${nextThemeLabel}`,
        run: () => {
          setTheme(fuiTheme === "void" ? "sunrise" : "midnight");
        },
      },
      {
        id: "open-appearance",
        label: "Appearance…",
        category: "THEME",
        keywords: "appearance style theme motion settings customize",
        run: () => {
          onClose();
          // Let the palette dialog unmount first so focus lands in the panel.
          window.setTimeout(onOpenAppearance, 0);
        },
      },
      {
        id: "copy-email",
        label: `Copy Contact Email (${profile.email})`,
        category: "COMMS",
        keywords: `copy contact email mail ${profile.email}`,
        badge: copied ? "COPIED_TO_CLIPBOARD" : undefined,
        run: () => {
          void navigator.clipboard?.writeText(profile.email);
          setCopied(true);
          if (copyTimerRef.current !== null) {
            window.clearTimeout(copyTimerRef.current);
          }
          copyTimerRef.current = window.setTimeout(() => {
            setCopied(false);
            copyTimerRef.current = null;
          }, 2400);
        },
      },
      {
        id: "open-work",
        label: "Open Work & Case Studies",
        category: "ROUTE",
        keywords: "work projects portfolio case studies",
        run: () => {
          void navigate("/work");
          onClose();
        },
      },
      {
        id: "open-about",
        label: "Open About & Career Log",
        category: "ROUTE",
        keywords: "about bio background experience career",
        run: () => {
          void navigate("/about");
          onClose();
        },
      },
      {
        id: "open-resume",
        label: "Open Resume",
        category: "ROUTE",
        keywords: "resume cv pdf experience career",
        run: () => {
          void navigate("/resume");
          onClose();
        },
      },
      {
        id: "open-contact",
        label: "Contact / Inquiry",
        category: "ROUTE",
        keywords: "contact inquiry message hire reach out",
        run: () => {
          void navigate("/contact");
          onClose();
        },
      },
      {
        id: "paradigm-studio",
        label: "Switch Paradigm: Studio",
        category: "MODE",
        keywords: "paradigm mode studio editorial",
        run: () => {
          setParadigm("studio");
          onClose();
        },
      },
      {
        id: "paradigm-kinetic",
        label: "Switch Paradigm: Kinetic",
        category: "MODE",
        keywords: "paradigm mode kinetic maximalist",
        run: () => {
          setParadigm("kinetic");
          onClose();
        },
      },
    ];

    if (selectedTech !== "ALL" && tokens.length === 0) return [];
    if (tokens.length === 0) return allCommands;
    return allCommands.filter((cmd) => {
      const haystack =
        `${cmd.label} ${cmd.category} ${cmd.keywords}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [
    copied,
    fuiTheme,
    navigate,
    onClose,
    onOpenAppearance,
    profile.email,
    selectedTech,
    setParadigm,
    setTheme,
    tokens,
  ]);

  const totalResults = filteredStudies.length + commands.length;
  const clampedActiveIndex =
    totalResults > 0 ? Math.min(activeIndex, totalResults - 1) : -1;

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (totalResults === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % totalResults);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + totalResults) % totalResults);
      } else if (event.key === "Enter") {
        const target = event.target as HTMLElement | null;
        if (target?.tagName === "BUTTON") return;
        event.preventDefault();
        if (clampedActiveIndex < 0) return;
        if (clampedActiveIndex < filteredStudies.length) {
          const study = filteredStudies[clampedActiveIndex];
          onSelectStudy(study.slug);
          onClose();
        } else {
          const cmd = commands[clampedActiveIndex - filteredStudies.length];
          cmd?.run();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    clampedActiveIndex,
    commands,
    filteredStudies,
    onClose,
    onSelectStudy,
    totalResults,
  ]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const hasResults = totalResults > 0;

  return (
    <div
      className="fui-palette-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="fui-palette"
        role="dialog"
        aria-modal="true"
        aria-label="System command palette"
      >
        <div className="fui-palette-search">
          <span className="fui-palette-prompt" aria-hidden="true">
            &gt;
          </span>
          <input
            ref={inputRef}
            type="search"
            className="fui-palette-input"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search projects, tech stack, or commands..."
            aria-label="Search projects, tech stack, or commands"
          />
          {query || selectedTech !== "ALL" ? (
            <button
              type="button"
              className="fui-palette-clear"
              onClick={() => {
                setQuery("");
                setSelectedTech("ALL");
                setActiveIndex(0);
                inputRef.current?.focus();
              }}
              aria-label="Clear search and filter"
            >
              CLEAR
            </button>
          ) : null}
          <button
            type="button"
            className="fui-palette-esc"
            onClick={onClose}
            aria-label="Close command palette"
          >
            ESC
          </button>
        </div>

        <div
          className="fui-palette-filters"
          role="group"
          aria-label="Filter projects by tech stack"
        >
          {techFilters.map((tech) => {
            const active = selectedTech === tech;
            return (
              <button
                key={tech}
                type="button"
                className="fui-palette-chip"
                aria-pressed={active}
                onClick={() => {
                  setSelectedTech(tech);
                  setActiveIndex(0);
                }}
              >
                {tech}
              </button>
            );
          })}
        </div>

        <div className="fui-palette-results">
          {filteredStudies.length > 0 ? (
            <section className="fui-palette-group" aria-label="Mission Modules">
              <div className="fui-palette-group-label">
                <span>Mission Modules</span>
                <span>
                  {String(filteredStudies.length).padStart(2, "0")} /{" "}
                  {String(caseStudies.length).padStart(2, "0")}
                </span>
              </div>
              <ul className="fui-palette-list">
                {filteredStudies.map((study, idx) => (
                  <li key={study.slug}>
                    <button
                      type="button"
                      className="fui-palette-item"
                      data-active={
                        clampedActiveIndex === idx ? "true" : undefined
                      }
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        onSelectStudy(study.slug);
                        onClose();
                      }}
                    >
                      <span className="fui-palette-item-main">
                        <span className="fui-palette-item-title">
                          {study.name}
                        </span>
                        <span className="fui-palette-item-meta">
                          {study.organization} · {study.role}
                        </span>
                      </span>
                      <span className="fui-palette-item-tags">
                        {study.technologies.slice(0, 3).join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {commands.length > 0 ? (
            <section className="fui-palette-group" aria-label="System Commands">
              <div className="fui-palette-group-label">
                <span>System Commands</span>
                <span>{String(commands.length).padStart(2, "0")}</span>
              </div>
              <ul className="fui-palette-list">
                {commands.map((cmd, idx) => {
                  const flatIndex = filteredStudies.length + idx;
                  return (
                    <li key={cmd.id}>
                      <button
                        type="button"
                        className="fui-palette-item"
                        data-active={
                          clampedActiveIndex === flatIndex ? "true" : undefined
                        }
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        onClick={cmd.run}
                      >
                        <span className="fui-palette-item-title">
                          {cmd.label}
                        </span>
                        {cmd.badge ? (
                          <span
                            className="fui-palette-badge"
                            role="status"
                            aria-live="polite"
                          >
                            {cmd.badge}
                          </span>
                        ) : (
                          <span className="fui-palette-cat">
                            {cmd.category}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {!hasResults ? (
            <p className="fui-palette-empty" role="status">
              NO_MATCHING_RECORDS
            </p>
          ) : null}
        </div>

        <div className="fui-palette-footer" aria-hidden="true">
          <span>↑↓ NAVIGATE</span>
          <span>↵ EXECUTE</span>
          <span>ESC CLOSE</span>
        </div>
      </div>
    </div>
  );
}

export function FuiCommandPalette({
  open,
  onClose,
  fuiTheme,
  onOpenAppearance,
  onSelectStudy,
}: FuiCommandPaletteProps) {
  if (!open) return null;

  return (
    <FuiCommandPaletteDialog
      onClose={onClose}
      fuiTheme={fuiTheme}
      onOpenAppearance={onOpenAppearance}
      onSelectStudy={onSelectStudy}
    />
  );
}

export default FuiCommandPalette;
