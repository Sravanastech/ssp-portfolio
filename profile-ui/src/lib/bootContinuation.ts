/**
 * Prerendered Aether pages start their CSS entrance animations straight from the HTML.
 * When React mounts it replaces that DOM, which would restart them. These helpers
 * measure how far the static animations had got and fast-forward the new DOM's
 * animations to the same point, so the boot continues instead of restarting.
 */
const CONTINUE_WINDOW_MS = 1500;

// Both ends are read on the document timeline: its time is frozen at the start of the
// current frame, so mixing it with performance.now() would undercount the elapsed time by
// however long the main thread has been busy since that frame (and rewind the boot).
let capture: { start: number; at: number } | null = null;
const adjusted = new WeakSet<Animation>();

const isCssAnimation = (a: Animation): a is CSSAnimation =>
  typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation;

const timelineNow = (): number | null => {
  const now = document.timeline?.currentTime;
  return typeof now === "number" ? now : null;
};

/** Call once, right before the first render: records the static animations' start. */
export function captureBootElapsed(root: Element | null): void {
  capture = null;
  if (!root || typeof document.getAnimations !== "function") return;
  const timeNow = timelineNow();
  if (timeNow === null) return;
  let earliest = Infinity;
  for (const animation of document.getAnimations()) {
    if (!isCssAnimation(animation)) continue;
    const target = (animation.effect as KeyframeEffect | null)?.target;
    if (!target || !root.contains(target)) continue;
    const start = animation.startTime;
    if (typeof start === "number") earliest = Math.min(earliest, start);
  }
  if (earliest === Infinity) return;
  capture = { start: Math.min(earliest, timeNow), at: timeNow };
}

/** Milliseconds of boot already played in the prerendered HTML (0 once out of window). */
export function getBootElapsed(): number {
  if (!capture) return 0;
  const now = timelineNow();
  if (now === null) return 0;
  return now - capture.at > CONTINUE_WINDOW_MS ? 0 : now - capture.start;
}

/** Fast-forwards CSS animations in `scope` that React just created (idempotent). */
export function continueBootAnimations(scope: Element | null): void {
  const elapsed = getBootElapsed();
  if (!scope || elapsed <= 0 || typeof document.getAnimations !== "function")
    return;
  for (const animation of document.getAnimations()) {
    if (!isCssAnimation(animation) || adjusted.has(animation)) continue;
    const target = (animation.effect as KeyframeEffect | null)?.target;
    if (!target || !scope.contains(target)) continue;
    adjusted.add(animation);
    animation.currentTime = elapsed;
  }
}
