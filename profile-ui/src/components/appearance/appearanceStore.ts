import { useSyncExternalStore } from "react";

/** Dispatch on window to open the panel from anywhere (HUD, command palette). */
export const APPEARANCE_OPEN_EVENT = "appearance:open";
export const APPEARANCE_SEEN_KEY = "appearance-seen";

let open = false;
let returnTarget: HTMLElement | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readSeen(): boolean {
  try {
    return localStorage.getItem(APPEARANCE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(APPEARANCE_SEEN_KEY, "1");
  } catch {
    /* The hint just shows again next visit. */
  }
}

/** Opens the panel; `trigger` is the element focus returns to and the popover anchors to. */
export function openAppearance(trigger?: HTMLElement | null) {
  returnTarget =
    trigger ??
    (document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null);
  markSeen();
  open = true;
  emit();
}

export function closeAppearance() {
  if (!open) return;
  open = false;
  emit();
}

export function toggleAppearance(trigger?: HTMLElement | null) {
  if (open) closeAppearance();
  else openAppearance(trigger);
}

export function getReturnTarget(): HTMLElement | null {
  return returnTarget;
}

export function useAppearanceOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}

/** False until the panel has been opened once (drives the discovery dot). */
export function useAppearanceSeen(): boolean {
  return useSyncExternalStore(subscribe, readSeen, () => true);
}
