import { createContext, useContext } from "react";
import { publicMetadata, navigation } from "@/data/siteSettings";
import copy from "@/data/siteCopy.json";
import { profile, experiences } from "@/data/profile";
import { caseStudies } from "@/data/caseStudies";
import { workProjects } from "@/data/workProjects";
import { expertiseData } from "@/data/expertise";

const bundledContent = {
  profile,
  experiences,
  caseStudies,
  workProjects,
  expertiseData,
  copy,
  seo: publicMetadata,
  navigation,
};
export type SiteContent = typeof bundledContent;

type ReleaseContent = Partial<SiteContent>;

/** A Site Studio release snapshot wins over the bundled data, key by key. */
export function withRelease(
  bundled: SiteContent,
  release: Partial<SiteContent> | undefined,
): SiteContent {
  return release ? { ...bundled, ...release } : bundled;
}

// src/data/release.json only exists in a release build (the deploy workflow fetches it from the
// backend; it is gitignored). The glob resolves to nothing when the file is absent. Prerender and
// the sitemap are built from this same module, so they always match the deployed content.
const releaseFiles = import.meta.glob<ReleaseContent>(
  "/src/data/release.json",
  { eager: true, import: "default" },
);

export const staticContent = withRelease(
  bundledContent,
  Object.values(releaseFiles)[0],
);
export const ContentContext = createContext<SiteContent>(staticContent);
export const useSiteContent = () => useContext(ContentContext);
