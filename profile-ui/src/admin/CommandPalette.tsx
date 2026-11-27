import { useMemo, useState, type KeyboardEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useNavigate } from "react-router-dom";
import type { NavItem } from "./permissions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavItem[];
};

/** Cmd/Ctrl+K navigation palette. Navigation only; Radix traps and restores focus. */
export default function CommandPalette({ open, onOpenChange, items }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
  }, [items, query]);
  const current = Math.min(active, Math.max(matches.length - 1, 0));

  function go(item: NavItem | undefined) {
    if (!item) return;
    onOpenChange(false);
    navigate(item.to);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(matches.length ? (current + 1) % matches.length : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(
        matches.length ? (current - 1 + matches.length) % matches.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(matches[current]);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setQuery("");
          setActive(0);
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="ops-dialog-overlay" />
        <Dialog.Content
          className="ops-dialog admin-palette"
          aria-describedby={undefined}
        >
          <Dialog.Title className="admin-palette-title">
            Go to page
          </Dialog.Title>
          <input
            className="field-input"
            role="combobox"
            aria-label="Search admin pages"
            aria-expanded="true"
            aria-controls="admin-palette-list"
            aria-activedescendant={
              matches.length ? `admin-palette-opt-${current}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
            placeholder="Type a page name"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <ul
            id="admin-palette-list"
            role="listbox"
            aria-label="Admin pages"
            className="admin-palette-list"
          >
            {matches.map((item, i) => (
              <li
                key={item.to}
                id={`admin-palette-opt-${i}`}
                role="option"
                aria-selected={i === current}
                className="admin-palette-option"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item)}
              >
                <span>{item.label}</span>
                <span className="admin-mono admin-palette-path">{item.to}</span>
              </li>
            ))}
          </ul>
          {matches.length === 0 && (
            <p role="status" className="ops-empty">
              No matching page.
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
