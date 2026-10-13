import type { SiteContent } from "@/content/SiteContent";
export type SiteSnapshot = { revision: number; content: SiteContent };
export async function fetchSite(signal?: AbortSignal): Promise<SiteSnapshot> {
  const response = await fetch("/api/site", {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
    headers: { Accept: "application/json" },
    cache: "no-cache",
  });
  if (!response.ok) throw new Error("Could not load the website. Please retry.");
  const data = await response.json() as SiteSnapshot;
  if (!Number.isSafeInteger(data.revision) || data.revision < 1 || !data.content?.profile) {
    throw new Error("Invalid website content response.");
  }
  return data;
}
