import { createContext, useContext } from "react";
import type { AdminMe } from "@/api/adminApi";

/** `getToken` asks Auth0 for a current access token; call it right before each request. */
export type AdminContextValue = {
  me: AdminMe;
  getToken: () => Promise<string>;
};

export const AdminContext = createContext<AdminContextValue | null>(null);

/** Resolved admin identity; only valid below <AdminShell />. */
export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used inside AdminShell");
  return value;
}
