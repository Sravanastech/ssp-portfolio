import { writeFile } from "node:fs/promises";
import { validateReleaseConfig } from "./release-config.mjs";

validateReleaseConfig(process.env);
const values = {
  AUTH0_DOMAIN: process.env.VITE_AUTH0_DOMAIN,
  AUTH0_AUDIENCE: process.env.VITE_AUTH0_AUDIENCE,
};
await writeFile(new URL(`../server/.env.${process.env.FIREBASE_PROJECT_ID}`, import.meta.url),
  Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n",
  { mode: 0o600 });
console.log("Production configuration validated; resume API environment prepared.");
