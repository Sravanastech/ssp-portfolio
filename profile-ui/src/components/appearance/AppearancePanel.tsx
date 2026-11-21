import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import AppearanceControls from "./AppearanceControls";
import { APPEARANCE_PANEL_ID } from "./AppearanceTrigger";
import {
  APPEARANCE_OPEN_EVENT,
  closeAppearance,
  getReturnTarget,
  openAppearance,
  useAppearanceOpen,
} from "./appearanceStore";

const SHEET_QUERY = "(max-width: 640px), (pointer: coarse)";
const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
const GAP = 8;
const EDGE = 12;

function useSheetMode(): boolean {
  const read = () =>
    typeof window !== "undefined" &&
    !!window.matchMedia?.(SHEET_QUERY)?.matches;
  const [sheet, setSheet] = useState(read);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia(SHEET_QUERY);
    const onChange = () => setSheet(query.matches);
    onChange();
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);
  return sheet;
}

/** The opener when it is a header trigger; otherwise the trigger currently on screen. */
function visibleTrigger(): HTMLElement | null {
  const opener = getReturnTarget();
  if (opener?.isConnected && opener.hasAttribute("data-appearance-trigger"))
    return opener;
  const all = Array.from(
    document.querySelectorAll<HTMLElement>("[data-appearance-trigger]"),
  );
  return all.find((el) => el.getClientRects().length > 0) ?? all[0] ?? null;
}

function PanelDialog() {
  const sheet = useSheetMode();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(true);
  const [style, setStyle] = useState<CSSProperties>({});

  const place = useCallback(() => {
    const anchor = visibleTrigger();
    if (sheet || !anchor) return setStyle({});
    const rect = anchor.getBoundingClientRect();
    const right = Math.max(EDGE, window.innerWidth - rect.right);
    setStyle({ top: rect.bottom + GAP, right });
  }, [sheet]);

  useLayoutEffect(() => {
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [place]);

  // Focus in on open; back to the opener on close (unless the visitor clicked elsewhere).
  useEffect(() => {
    const panel = panelRef.current;
    const target =
      panel?.querySelector<HTMLElement>("input:checked") ??
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();
    return () => {
      if (!restoreFocus.current) return;
      const opener = getReturnTarget();
      (opener?.isConnected ? opener : visibleTrigger())?.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault(); // Keeps Aether's "Escape skips intro" from also firing.
      closeAppearance();
    };
    const onPointerDown = (event: PointerEvent) => {
      const node = event.target as Node;
      if (panelRef.current?.contains(node)) return;
      if ((node as Element).closest?.("[data-appearance-trigger]")) return;
      restoreFocus.current = false;
      closeAppearance();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!sheet || event.key !== "Tab") return;
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (
      event.shiftKey &&
      (active === first || !panelRef.current?.contains(active))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (active === last || !panelRef.current?.contains(active))
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      {sheet && <div className="appearance-backdrop" aria-hidden="true" />}
      <div
        ref={panelRef}
        id={APPEARANCE_PANEL_ID}
        className="appearance-panel"
        data-presentation={sheet ? "sheet" : "popover"}
        data-paradigm-ui
        role="dialog"
        aria-modal={sheet ? "true" : undefined}
        aria-labelledby="appearance-title"
        style={style}
        onKeyDown={trapFocus}
      >
        <header className="appearance-header">
          <h2 id="appearance-title" className="appearance-title">
            Appearance
          </h2>
          <button
            type="button"
            className="appearance-close"
            aria-label="Close panel"
            onClick={closeAppearance}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <AppearanceControls />
      </div>
    </>
  );
}

/** One panel for the whole site; opened by the header trigger or APPEARANCE_OPEN_EVENT. */
export default function AppearancePanel() {
  const open = useAppearanceOpen();

  useEffect(() => {
    const onOpen = () => openAppearance();
    window.addEventListener(APPEARANCE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(APPEARANCE_OPEN_EVENT, onOpen);
  }, []);

  if (!open || typeof document === "undefined") return null;
  return createPortal(<PanelDialog />, document.body);
}
