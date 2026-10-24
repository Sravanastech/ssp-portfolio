// Fails a release build when the production configuration would ship localhost
// or incomplete values. Uses Vite's own env resolution so a stray .env.local
// (which Vite loads for production builds) is caught instead of leaking in.
import { loadEnv } from "vite";
import { validateReleaseConfig } from "./release-config.mjs";

const env = {
  FIREBASE_PROJECT_ID: "ssp-profile",
  ...loadEnv("production", process.cwd(), "VITE_"),
  ...Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined),
  ),
};
validateReleaseConfig(env);
console.log("Production configuration validated.");
