// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateReleaseConfig } from "./release-config.mjs";

const valid = {
  FIREBASE_PROJECT_ID: "ssp-profile-ui",
  VITE_AUTH0_DOMAIN: "portfolio.us.auth0.com",
  VITE_AUTH0_CLIENT_ID: "production-client",
  VITE_AUTH0_CALLBACK_URL: "https://sravanasparimi.com/auth-callback",
  VITE_AUTH0_AUDIENCE: "https://portfolio-api.example.com",
  VITE_WEB3FORMS_ACCESS_KEY: "production-form-key",
};

describe("production configuration gate", () => {
  it("accepts the complete production configuration", () => {
    expect(() => validateReleaseConfig(valid)).not.toThrow();
  });
  it.each(Object.keys(valid))("rejects missing %s", (name) => {
    expect(() => validateReleaseConfig({ ...valid, [name]: "" })).toThrow(name);
  });
  it.each([
    "http://localhost:5173/",
    "https://other.example.com/auth-callback",
    "https://sravanasparimi.com@other.example.com/",
  ])("rejects a callback outside the production origin: %s", (url) => {
    expect(() => validateReleaseConfig({ ...valid, VITE_AUTH0_CALLBACK_URL: url })).toThrow("VITE_AUTH0_CALLBACK_URL");
  });
  it("rejects a Management API audience instead of a resume API audience", () => {
    expect(() => validateReleaseConfig({ ...valid, VITE_AUTH0_AUDIENCE: "https://portfolio.us.auth0.com/api/v2/" })).toThrow("VITE_AUTH0_AUDIENCE");
  });
  it("rejects dotenv injection and invalid tenant hosts", () => {
    expect(() => validateReleaseConfig({ ...valid, VITE_AUTH0_DOMAIN: "tenant.auth0.com\nOTHER=value" })).toThrow("VITE_AUTH0_DOMAIN");
  });
});
