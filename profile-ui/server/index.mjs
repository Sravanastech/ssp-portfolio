import { createServer } from "node:http";
import { createResumeHandler } from "./resume.mjs";
import { handleTelemetry } from "./telemetry.mjs";

const resume = createResumeHandler();
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/api/resume") return resume(request, response);
  if (pathname === "/api/events") return handleTelemetry(request, response);
  response.writeHead(404, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify({ error: "Not found" }));
});
server.listen(
  Number(process.env.API_PORT || 8787),
  process.env.API_HOST || "127.0.0.1",
  () => {
    console.info(
      `Portfolio API listening on port ${process.env.API_PORT || 8787}`,
    );
  },
);
