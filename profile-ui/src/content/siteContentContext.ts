import { createContext, useContext } from "react";
import { publicMetadata, navigation } from "@/data/siteSettings";
import copy from "@/data/siteCopy.json";
import { profile, experiences } from "@/data/profile";
import { caseStudies } from "@/data/caseStudies";
import { workProjects } from "@/data/workProjects";
import { expertiseData } from "@/data/expertise";

export const staticContent = {
  profile,
  experiences,
  caseStudies,
  workProjects,
  expertiseData,
  copy,
  seo: publicMetadata,
  navigation,
};
export type SiteContent = typeof staticContent;
export const ContentContext = createContext<SiteContent>(staticContent);
export const useSiteContent = () => useContext(ContentContext);
