import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { createResumeHandler } from "./resume.mjs";

const domain = defineString("AUTH0_DOMAIN");
const audience = defineString("AUTH0_AUDIENCE");
let handler;

// Public invocation reaches our JWT gate; it does not grant public PDF access.
export const resumeApi = onRequest({
  region: "us-central1",
  invoker: "public",
  minInstances: 0,
  maxInstances: 2,
  timeoutSeconds: 30,
  memory: "256MiB",
}, (request, response) => {
  handler ??= createResumeHandler({
    domain: domain.value(),
    audience: audience.value(),
    resumePath: new URL("./private/Sravana_Parimi.pdf", import.meta.url),
  });
  return handler(request, response);
});
