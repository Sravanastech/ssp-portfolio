export type Permission =
  | "content.edit"
  | "content.publish"
  | "media.upload"
  | "inquiries.manage"
  | "insights.read"
  | "people.read"
  | "people.manage"
  | "team.manage"
  | "audit.read"
  | "settings.manage";

export const NAV: { to: string; label: string; needs: Permission | null }[] = [
  { to: "/admin", label: "Overview", needs: null },
  { to: "/admin/team", label: "Team", needs: "team.manage" },
  { to: "/admin/audit", label: "Audit log", needs: "audit.read" },
];

export function visibleNav(perms: Permission[]) {
  return NAV.filter((n) => n.needs === null || perms.includes(n.needs));
}
