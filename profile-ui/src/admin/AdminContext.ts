import { createContext, useContext } from "react";
import type { AdminMe, AdminSummary } from "@/api/adminApi";

export type SummaryState =
  | { status: "loading" }
  | { status: "ready"; data: AdminSummary }
  | { status: "error" };

/** `getToken` asks Auth0 for a current access token; call it right before each request. */
export type AdminContextValue = {
  me: AdminMe;
  getToken: () => Promise<string>;
  /** Shared /summary counts (Home cards, Inbox badge). Absent in isolated page tests. */
  summary?: SummaryState;
  /** Refetch /summary now, ignoring the 30 s throttle. */
  refreshSummary?: () => void;
};

export const AdminContext = createContext<AdminContextValue | null>(null);

/** Resolved admin identity; only valid below <AdminShell />. */
export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used inside AdminShell");
  return value;
}
