import type { BlockSchema } from "@/api/studioApi";
import labels from "@content-schema/page-text-labels.json";

export type TextLabel = { page: string; section: string; label: string };
export const TEXT_LABELS = labels as Record<string, TextLabel>;

export const PAGES = ["Home", "Work", "About", "Contact", "Global"] as const;
export type PageName = (typeof PAGES)[number];

export type Section = {
  id: string;
  page: PageName;
  label: string;
  /** Schema sections edit blocks of one type; text sections edit page-text keys. */
  type?: string;
  keys?: string[];
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const pageSlug = (p: string) => p.toLowerCase();
export const textBlockSlug = (key: string) =>
  key.split(".").slice(0, 2).join(".");

export function buildOutline(schemas: BlockSchema[]): Section[] {
  const out: Section[] = [];
  const used = new Set<string>();
  const add = (s: Omit<Section, "id">, preferred: string) => {
    let id = slugify(preferred);
    while (used.has(`${s.page}/${id}`)) id += "-text";
    used.add(`${s.page}/${id}`);
    out.push({ ...s, id });
  };
  for (const page of PAGES) {
    schemas
      .filter(
        (s) => s["x-studio"].page === page && s["x-studio"].shape !== "merge",
      )
      .sort((a, b) => (a["x-studio"].order ?? 0) - (b["x-studio"].order ?? 0))
      .forEach((s) =>
        add(
          {
            page,
            label: s["x-studio"].section ?? s.title ?? s["x-studio"].type,
            type: s["x-studio"].type,
          },
          s["x-studio"].section ?? s["x-studio"].type,
        ),
      );
    const groups = new Map<string, string[]>();
    for (const [key, l] of Object.entries(TEXT_LABELS))
      if (l.page === page) {
        const g = groups.get(l.section) ?? [];
        g.push(key);
        groups.set(l.section, g);
      }
    for (const [section, keys] of groups)
      add({ page, label: section, keys }, section);
  }
  return out;
}

export function findSection(
  outline: Section[],
  page?: string,
  section?: string,
): Section | undefined {
  return outline.find((s) => pageSlug(s.page) === page && s.id === section);
}

export const sectionPath = (s: Section) =>
  `/admin/content/${pageSlug(s.page)}/${s.id}`;

export const previewRoute = (page: PageName) =>
  ({
    Home: "/",
    Work: "/work",
    About: "/about",
    Contact: "/contact",
    Global: "/",
  })[page];
