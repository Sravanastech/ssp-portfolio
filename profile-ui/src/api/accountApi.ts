export type Account = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  admin: boolean;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
};

function requireToken(token: string | undefined): string {
  if (!token) throw new Error("Your session expired. Sign in again.");
  return token;
}

export async function accountRequest<T = Account>(
  rawToken: string | undefined,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const token = requireToken(rawToken);
  const response = await fetch("/api/me", {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 410) throw new Error("This profile was deleted.");
    throw new Error(
      response.status === 401
        ? "Your session expired. Sign in again."
        : "Could not save your account. Please retry.",
    );
  }
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

export type AccountProfileUpdate = Pick<
  Account,
  | "firstName"
  | "lastName"
  | "phone"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "region"
  | "postalCode"
  | "country"
>;

export async function adminRequest<T>(
  rawToken: string | undefined,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const token = requireToken(rawToken);
  const response = await fetch(`/api/admin${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  if (response.status === 409)
    throw new Error(
      "CONFLICT: This draft changed. Reload the latest version before saving.",
    );
  if (response.status === 403)
    throw new Error("You do not have permission to edit this site.");
  if (!response.ok)
    throw new Error(
      "The change could not be saved. Your edits are still on this page.",
    );
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}
