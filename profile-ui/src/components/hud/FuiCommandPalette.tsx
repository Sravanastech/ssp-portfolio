import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSiteContent } from "@/content/siteContentContext";
import { useParadigm } from "@/theme/ParadigmContext";

export interface FuiCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  fuiTheme: "void" | "cleanroom";
  onToggleFuiTheme: () => void;
  onSelectStudy: (slug: string) => void;
}

interface PaletteCommand {
  id: string;
  label: string;
  keywords: string;
  badge?: string;
  run: () => void;
}

function FuiCommandPaletteDialog({
  onClose,
  fuiTheme,
  onToggleFuiTheme,
  onSelectStudy,
}: Omit<FuiCommandPaletteProps, "open">) {
  const { profile, caseStudies } = useSiteContent();
  const { setParadigm } = useParadigm();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, [onClose]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredStudies = useMemo(() => {
    if (!normalizedQuery) return caseStudies;
    return caseStudies.filter((study) => {
      const haystack = [study.name, study.organization, ...study.technologies]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [caseStudies, normalizedQuery]);

  const commands = useMemo<PaletteCommand[]>(() => {
    const nextThemeLabel = fuiTheme === "void" ? "CLEANROOM" : "VOID";
    const allCommands: PaletteCommand[] = [
      {
        id: "toggle-fui-theme",
        label: `Switch FUI Theme (${nextThemeLabel})`,
        keywords: `theme void cleanroom light dark ${nextThemeLabel}`,
        run: () => {
          onToggleFuiTheme();
        },
      },
      {
        id: "copy-email",
        label: `Copy Contact Email (${profile.email})`,
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
        id: "open-resume",
        label: "Open Resume",
        keywords: "resume cv pdf experience career",
        run: () => {
          void navigate("/resume");
          onClose();
        },
      },
      {
        id: "open-contact",
        label: "Contact / Inquiry",
        keywords: "contact inquiry message hire reach out",
        run: () => {
          void navigate("/contact");
          onClose();
        },
      },
      {
        id: "paradigm-studio",
        label: "Switch Paradigm: Studio",
        keywords: "paradigm mode studio editorial",
        run: () => {
          setParadigm("studio");
          onClose();
        },
      },
      {
        id: "paradigm-kinetic",
        label: "Switch Paradigm: Kinetic",
        keywords: "paradigm mode kinetic maximalist",
        run: () => {
          setParadigm("kinetic");
          onClose();
        },
      },
    ];

    if (!normalizedQuery) return allCommands;
    return allCommands.filter((cmd) =>
      `${cmd.label} ${cmd.keywords}`.toLowerCase().includes(normalizedQuery),
    );
  }, [
    copied,
    fuiTheme,
    navigate,
    normalizedQuery,
    onClose,
    onToggleFuiTheme,
    profile.email,
    setParadigm,
  ]);

  const hasResults = filteredStudies.length > 0 || commands.length > 0;

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
          <input
            ref={inputRef}
            type="search"
            className="fui-palette-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects, tech stack, or commands..."
            aria-label="Search projects, tech stack, or commands"
          />
          <button
            type="button"
            className="fui-palette-esc"
            onClick={onClose}
            aria-label="Close command palette"
          >
            ESC
          </button>
        </div>

        <div className="fui-palette-results">
          {filteredStudies.length > 0 ? (
            <section className="fui-palette-group" aria-label="Mission Modules">
              <div className="fui-palette-group-label">Mission Modules</div>
              <ul className="fui-palette-list">
                {filteredStudies.map((study) => (
                  <li key={study.slug}>
                    <button
                      type="button"
                      className="fui-palette-item"
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
                          {study.organization}
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
              <div className="fui-palette-group-label">System Commands</div>
              <ul className="fui-palette-list">
                {commands.map((cmd) => (
                  <li key={cmd.id}>
                    <button
                      type="button"
                      className="fui-palette-item"
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
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {!hasResults ? (
            <p className="fui-palette-empty" role="status">
              NO_MATCHING_RECORDS
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FuiCommandPalette({
  open,
  onClose,
  fuiTheme,
  onToggleFuiTheme,
  onSelectStudy,
}: FuiCommandPaletteProps) {
  if (!open) return null;

  return (
    <FuiCommandPaletteDialog
      onClose={onClose}
      fuiTheme={fuiTheme}
      onToggleFuiTheme={onToggleFuiTheme}
      onSelectStudy={onSelectStudy}
    />
  );
}

export default FuiCommandPalette;
