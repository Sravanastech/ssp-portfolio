/**
 * Resume access token for the email-code flow. Lives in sessionStorage only
 * (cleared on tab close), never in the URL, never logged. If storage is
 * blocked it falls back to memory for the page lifetime.
 */
const KEY = "resume.otp";
const SAFETY_MS = 5_000;

type Stored = { token: string; exp: number };
let memory: Stored | null = null;

function valid(value: unknown): value is Stored {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Stored).token === "string" &&
    typeof (value as Stored).exp === "number"
  );
}

function read(): Stored | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (valid(parsed)) return parsed;
    }
  } catch {
    /* storage blocked or corrupt: use memory */
  }
  return memory;
}

export function getToken(): string | null {
  const stored = read();
  if (!stored) return null;
  if (Date.now() >= stored.exp - SAFETY_MS) {
    clear();
    return null;
  }
  return stored.token;
}

export function setToken(token: string, expiresInSeconds: number): void {
  const value: Stored = { token, exp: Date.now() + expiresInSeconds * 1000 };
  memory = value;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* in-memory copy already holds it */
  }
}

export function clear(): void {
  memory = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
