import type { Permission } from "@/admin/permissions";

export type AdminErrorCode =
  | "account_not_provisioned"
  | "mfa_required"
  | "forbidden"
  | "invite_unavailable";

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: AdminErrorCode,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

const MESSAGES: Record<AdminErrorCode, string> = {
  account_not_provisioned: "Open your account page once, then come back.",
  mfa_required: "This area needs multi-factor sign-in.",
  forbidden: "Your role does not include this area.",
  invite_unavailable: "This invite is expired, already used, or revoked.",
};

export async function adminFetch<T>(
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    cache: "no-store",
  });
  if (!res.ok) {
    let code: AdminErrorCode | undefined;
    try {
      const body = (await res.json()) as { code?: unknown };
      if (typeof body.code === "string" && body.code in MESSAGES)
        code = body.code as AdminErrorCode;
    } catch {
      /* no body */
    }
    throw new AdminApiError(
      code
        ? MESSAGES[code]
        : res.status === 429
          ? "Too many invites. Try again later."
          : "Request failed. Please retry.",
      res.status,
      code,
    );
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export type AdminMe = {
  role: "owner" | "editor";
  canPublish: boolean;
  permissions: Permission[];
};
