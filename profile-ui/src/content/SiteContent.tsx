import { publicMetadata, navigation } from "@/data/siteSettings";
import copy from "@/data/siteCopy.json";
import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { profile, experiences } from "@/data/profile";
import { caseStudies } from "@/data/caseStudies";
import { workProjects } from "@/data/workProjects";
import { expertiseData } from "@/data/expertise";
import { fetchSite } from "@/api/siteApi";
export const staticContent = { profile, experiences, caseStudies, workProjects, expertiseData, copy, seo:publicMetadata, navigation };
export type SiteContent = typeof staticContent;
const ContentContext = createContext<SiteContent>(staticContent);
export const useSiteContent = () => useContext(ContentContext);
export function SnapshotProvider({content,children}: {content:SiteContent; children:ReactNode}) {
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}
function ApiContent({children}: {children:ReactNode}) {
  const query = useQuery({queryKey:["site"],queryFn:({signal})=>fetchSite(signal),staleTime:60000,retry:1});
  if(query.isPending) return <main className="studio-container p-8" role="status">Loading website…</main>;
  if(query.isError) {
    return (
      <SnapshotProvider content={staticContent}>
        <aside
          role="status"
          aria-label="Content status notice"
          className="w-full bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs text-center flex items-center justify-center gap-3"
        >
          <span>Viewing curated portfolio snapshot (live updates temporarily unavailable).</span>
          <button
            onClick={() => void query.refetch()}
            className="underline font-semibold hover:opacity-80 focus:outline-none"
          >
            Retry live sync
          </button>
        </aside>
        {children}
      </SnapshotProvider>
    );
  }
  return <SnapshotProvider content={query.data.content}>{children}</SnapshotProvider>;
}
export function SiteContentProvider({children}: {children:ReactNode}) {
  const mode=import.meta.env.VITE_CONTENT_MODE || "static";
  if(mode==="static")return <SnapshotProvider content={staticContent}>{children}</SnapshotProvider>;
  if(mode==="api")return <ApiContent>{children}</ApiContent>;
  throw new Error("VITE_CONTENT_MODE must be static or api");
}

export function SiteText({id}:{id:string}) {
  const {copy}=useSiteContent();
  const value = (copy as Record<string,string>)[id];
  if (value === undefined && import.meta.env.DEV) {
    console.warn(`[SiteText] Missing copy for id: "${id}"`);
  }
  return value ?? "";
}
