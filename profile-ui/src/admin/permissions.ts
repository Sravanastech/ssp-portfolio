export type Permission =
  | "content.edit"
  | "content.publish"
  | "media.upload"
  | "inquiries.manage"
  | "inquiries.reply"
  | "insights.read"
  | "people.read"
  | "people.manage"
  | "team.manage"
  | "audit.read"
  | "settings.manage";

export type NavItem = { to: string; label: string; needs: Permission | null };
export type NavGroup = { group: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    group: "Home",
    items: [{ to: "/admin", label: "Home", needs: null }],
  },
  {
    group: "Site",
    items: [
      { to: "/admin/content", label: "Content", needs: "content.edit" },
      { to: "/admin/inbox", label: "Inbox", needs: "inquiries.manage" },
    ],
  },
  {
    group: "Audience",
    items: [{ to: "/admin/people", label: "People", needs: "people.read" }],
  },
  {
    group: "Settings",
    items: [
      { to: "/admin/settings/team", label: "Team", needs: "team.manage" },
      {
        to: "/admin/settings/audit",
        label: "Audit log",
        needs: "audit.read",
      },
    ],
  },
];

/** Nav groups reduced to the items the role may open; empty groups are dropped. */
export function visibleNav(perms: Permission[]): NavGroup[] {
  return NAV.map((g) => ({
    ...g,
    items: g.items.filter((n) => n.needs === null || perms.includes(n.needs)),
  })).filter((g) => g.items.length > 0);
}

/** Flat list of permitted pages (command palette). */
export function visibleItems(perms: Permission[]): NavItem[] {
  return visibleNav(perms).flatMap((g) => g.items);
}
