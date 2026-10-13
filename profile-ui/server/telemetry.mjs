const events = new Set(["web_vital", "ui_error", "contact_success", "contact_failure"]);
let windowStart = Date.now();
let received = 0;

export async function handleTelemetry(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") { response.writeHead(405).end(); return; }
  // Global bounded budget: no retained visitor identifiers and no unbounded map.
  if (Date.now() - windowStart > 60000) { windowStart = Date.now(); received = 0; }
  if (++received > 120) { response.writeHead(429).end(); return; }
  let body = "";
  try {
    for await (const chunk of request) {
      body += chunk;
      if (Buffer.byteLength(body) > 1024) { response.writeHead(413).end(); return; }
    }
    const data = JSON.parse(body);
    if (!events.has(data.event)) { response.writeHead(400).end(); return; }
    const entry = { event: data.event, timestamp: new Date().toISOString() };
    if (data.event === "web_vital") {
      if (!["CLS", "LCP", "INP"].includes(data.metric?.name) || !Number.isFinite(data.metric?.value) || data.metric.value < 0) {
        response.writeHead(400).end(); return;
      }
      entry.metric = { name: data.metric.name, value: data.metric.value };
    }
    // Structured log sink; configure host alerts for delivery failures and errors.
    console.info(JSON.stringify(entry));
    response.writeHead(204).end();
  } catch { response.writeHead(400).end(); }
}
