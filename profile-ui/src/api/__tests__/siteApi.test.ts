import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchSite } from "../siteApi";
afterEach(() => vi.unstubAllGlobals());
describe("published content API", () => {
 it("returns the database revision and content", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({revision:7, content:{profile:{name:"Database name"}}}))));
  expect((await fetchSite()).revision).toBe(7);
 });
 it("rejects unavailable API without bundled fallback", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("",{status:503})));
  await expect(fetchSite()).rejects.toThrow("load");
 });
 it("rejects malformed snapshots", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{}')));
  await expect(fetchSite()).rejects.toThrow("content");
 });
});
