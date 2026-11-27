import type { Permission } from "@/admin/permissions";

export type AdminErrorCode =
  | "account_not_provisioned"
  | "mfa_required"
  | "forbidden"
  | "invite_unavailable"
  | "no_email"
  | "reply_rate_limited"
  | "email_failed";

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
  no_email: "This person left no email address. Call or text instead.",
  reply_rate_limited: "Reply limit reached. Try again in an hour.",
  email_failed: "The email could not be sent. Nothing was delivered.",
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
          ? "Too many requests. Try again later."
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

/** Counts for the Home page and Inbox badge; each field only exists with its permission. */
export type AdminSummary = {
  openInquiries?: number;
  draftPending?: boolean;
  newResumeVisitors7d?: number;
  deniedEvents7d?: number;
};

export type InquiryRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  archived: boolean;
  created_at: string;
  delivery: string;
  replied_at: string | null;
  reply_count: number;
};

export type InquiryReply = {
  id: string;
  authorName: string;
  body: string;
  status: "sending" | "sent" | "failed";
  createdAt: string;
};
