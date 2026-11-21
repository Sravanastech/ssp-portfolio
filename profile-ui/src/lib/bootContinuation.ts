/**
 * Prerendered Aether pages start their CSS entrance animations straight from the HTML.
 * When React mounts it replaces that DOM, which would restart them. These helpers
 * measure how far the static animations had got and fast-forward the new DOM's
 * animations to the same point, so the boot continues instead of restarting.
 */
const CONTINUE_WINDOW_MS = 1500;

let capture: { elapsed: number; at: number } | null = null;
const adjusted = new WeakSet<Animation>();

const isCssAnimation = (a: Animation): a is CSSAnimation =>
  typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation;

/** Call once, right before the first render: records the static animations' progress. */
export function captureBootElapsed(root: Element | null): void {
  capture = null;
  if (!root || typeof document.getAnimations !== "function") return;
  const timeNow = document.timeline.currentTime;
  if (typeof timeNow !== "number") return;
  let earliest = Infinity;
  for (const animation of document.getAnimations()) {
    if (!isCssAnimation(animation)) continue;
    const target = (animation.effect as KeyframeEffect | null)?.target;
    if (!target || !root.contains(target)) continue;
    const start = animation.startTime;
    if (typeof start === "number") earliest = Math.min(earliest, start);
  }
  if (earliest === Infinity) return;
  capture = { elapsed: Math.max(0, timeNow - earliest), at: performance.now() };
}

/** Milliseconds of boot already played in the prerendered HTML (0 once out of window). */
export function getBootElapsed(): number {
  if (!capture) return 0;
  const sinceCapture = performance.now() - capture.at;
  return sinceCapture > CONTINUE_WINDOW_MS ? 0 : capture.elapsed + sinceCapture;
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
