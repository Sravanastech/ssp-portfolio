type Nav = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

/** Sets html[data-perf] to "lite" on weak CPUs/RAM or constrained networks, else "full". */
export function applyPerfTier(): "lite" | "full" {
  const n = navigator as Nav;
  const c = n.connection;
  const lite =
    n.hardwareConcurrency <= 4 ||
    (n.deviceMemory ?? 8) <= 4 ||
    !!c?.saveData ||
    /^[23]g$|^slow-2g$/.test(c?.effectiveType ?? "") ||
    !!matchMedia?.("(prefers-reduced-data: reduce)").matches;
  const tier = lite ? "lite" : "full";
  document.documentElement.dataset.perf = tier;
  return tier;
}
