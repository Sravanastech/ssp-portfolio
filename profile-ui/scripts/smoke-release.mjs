import assert from "node:assert/strict";

const base = process.env.SITE_URL || "http://127.0.0.1:5500";
for (const route of ["/", "/work", "/about", "/contact", "/privacy", "/termsconditions"]) {
  const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${route} must load`);
  assert.match(response.headers.get("content-type") || "", /text\/html/, `${route} must return HTML`);
  assert.match(await response.text(), /<main\b/, `${route} must include prerendered content`);
}
for (const headers of [{}, { Authorization: "Bearer invalid-token" }]) {
  const response = await fetch(new URL("/api/resume", base), { headers, signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 401, "Resume requests without valid credentials must reach the API and return 401");
  assert.match(response.headers.get("content-type") || "", /application\/json/);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
}
for (const route of ["/Sravana_Parimi.pdf", "/private/Sravana_Parimi.pdf", "/server/private/Sravana_Parimi.pdf"]) {
  const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(15000) });
  assert.doesNotMatch(response.headers.get("content-type") || "", /application\/pdf/);
  assert.notEqual(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
}
console.log("Public routes load; the resume rewrite rejects missing/invalid credentials; no public PDF is exposed.");
