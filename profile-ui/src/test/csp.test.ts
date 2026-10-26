/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const firebase = JSON.parse(readFileSync("firebase.json", "utf8"));
const header = firebase.hosting.headers
  .find((h: { source: string }) => h.source === "**")
  .headers.find((h: { key: string }) => h.key === "Content-Security-Policy")
  .value as string;
const csp = new Map(
  header.split(";").map((part) => {
    const [name, ...values] = part.trim().split(/\s+/);
    return [name, values] as const;
  }),
);

describe("firebase.json CSP supports the pdf.js resume preview", () => {
  it("loads the pdf.js worker and blob object URLs from allowed origins", () => {
    expect(csp.get("worker-src")).toContain("'self'");
    expect(csp.get("script-src")).toContain("'self'");
    expect(csp.get("connect-src")).toContain("'self'");
    expect(csp.get("img-src")).toContain("blob:");
  });
  it("keeps eval and wasm compilation disabled", () => {
    for (const directive of ["script-src", "default-src", "worker-src"]) {
      const values = csp.get(directive) ?? [];
      expect(values).not.toContain("'unsafe-eval'");
      expect(values).not.toContain("'wasm-unsafe-eval'");
      expect(values).not.toContain("'unsafe-inline'");
    }
  });
});
