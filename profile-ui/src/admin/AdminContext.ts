import { createContext, useContext } from "react";
import type { AdminMe } from "@/api/adminApi";

export type AdminContextValue = { me: AdminMe; token: string };

export const AdminContext = createContext<AdminContextValue | null>(null);

/** Resolved admin identity; only valid below <AdminShell />. */
export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used inside AdminShell");
  return value;
}
