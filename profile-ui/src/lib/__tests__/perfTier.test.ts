import { afterEach, describe, expect, it, vi } from "vitest";
import { applyPerfTier } from "../perfTier";

function setNav(props: Record<string, unknown>) {
  const base = {
    hardwareConcurrency: 8,
    deviceMemory: 8,
    connection: undefined,
  };
  for (const [k, v] of Object.entries({ ...base, ...props }))
    Object.defineProperty(navigator, k, { value: v, configurable: true });
}
function setReducedData(matches: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: matches && q.includes("prefers-reduced-data"),
  }));
}

describe("applyPerfTier", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.perf;
  });

  it("is full on a capable device", () => {
    setNav({});
    setReducedData(false);
    expect(applyPerfTier()).toBe("full");
    expect(document.documentElement.dataset.perf).toBe("full");
  });

  it.each([
    ["few cores", { hardwareConcurrency: 4 }],
    ["low memory", { deviceMemory: 4 }],
    ["save-data", { connection: { saveData: true } }],
    ["3g", { connection: { effectiveType: "3g" } }],
    ["2g", { connection: { effectiveType: "2g" } }],
  ])("is lite for %s", (_label, props) => {
    setNav(props);
    setReducedData(false);
    expect(applyPerfTier()).toBe("lite");
    expect(document.documentElement.dataset.perf).toBe("lite");
  });

  it("is lite for prefers-reduced-data", () => {
    setNav({});
    setReducedData(true);
    expect(applyPerfTier()).toBe("lite");
  });

  it("keeps 4g full", () => {
    setNav({ connection: { effectiveType: "4g" } });
    setReducedData(false);
    expect(applyPerfTier()).toBe("full");
  });
});
