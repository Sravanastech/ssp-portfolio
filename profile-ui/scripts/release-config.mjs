export function validateReleaseConfig(env) {
  const required = [
    "FIREBASE_PROJECT_ID", "VITE_AUTH0_DOMAIN", "VITE_AUTH0_CLIENT_ID",
    "VITE_AUTH0_CALLBACK_URL", "VITE_AUTH0_AUDIENCE", "VITE_WEB3FORMS_ACCESS_KEY",
  ];
  for (const name of required) {
    if (!env[name]?.trim() || /[\r\n]/.test(env[name])) {
      throw new Error(`${name} must be configured for production.`);
    }
  }
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(env.FIREBASE_PROJECT_ID)) {
    throw new Error("FIREBASE_PROJECT_ID is invalid.");
  }
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(env.VITE_AUTH0_DOMAIN)) {
    throw new Error("VITE_AUTH0_DOMAIN must be the tenant hostname, without a URL path.");
  }
  let callback;
  try { callback = new URL(env.VITE_AUTH0_CALLBACK_URL); } catch { /* rejected below */ }
  if (!callback || callback.origin !== "https://sravanasparimi.com" ||
      callback.username || callback.password || callback.search || callback.hash ||
      !["/", "/auth-callback"].includes(callback.pathname)) {
    throw new Error("VITE_AUTH0_CALLBACK_URL must use the production origin and / or /auth-callback.");
  }
  if (/\/api\/v2\/?$/.test(env.VITE_AUTH0_AUDIENCE) || /localhost|127\.0\.0\.1/i.test(env.VITE_AUTH0_AUDIENCE)) {
    throw new Error("VITE_AUTH0_AUDIENCE must identify the production resume API, not the Auth0 Management API.");
  }
}
