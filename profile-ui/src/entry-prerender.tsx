/* eslint-disable react-refresh/only-export-components -- server entry, not a refreshed module */
import { renderToString } from "react-dom/server";
import { Route, Routes, StaticRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import type { HelmetServerState } from "react-helmet-async";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import { ThemeProvider } from "./theme/ThemeContext";
import Layout from "./layouts/Layout";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import WorkPage from "./pages/WorkPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsAndConditions from "./pages/TermsAndConditions";
import ProjectPage from "./pages/ProjectPage";
import ErrorPage from "./pages/ErrorPage";
import { NOT_FOUND_ROUTE } from "./components/PageMetadata";
import { publicMetadata, projectSlug } from "./data/siteSettings";
import { caseStudies } from "./data/caseStudies";
import { SnapshotProvider } from "./content/SiteContent";
import { staticContent, type SiteContent } from "./content/siteContentContext";

const NotFound = () => (
  <ErrorPage code="404" message="Page not found" autoRedirect={false} />
);

const projectRoutes = caseStudies
  .map(projectSlug)
  .filter((slug): slug is string => !!slug)
  .map((slug) => `/work/${slug}`);

const pages: Record<string, React.ComponentType> = {
  ...Object.fromEntries(projectRoutes.map((r) => [r, NotFound])),
  [NOT_FOUND_ROUTE]: NotFound,
  "/": HomePage,
  "/about": AboutPage,
  "/work": WorkPage,
  "/contact": ContactPage,
  "/privacy": PrivacyPage,
  "/termsconditions": TermsAndConditions,
};
/** Indexable routes (static pages and project pages). The 404 page is written separately. */
export const routes = [...Object.keys(publicMetadata), ...projectRoutes];
export const notFoundRoute = NOT_FOUND_ROUTE;

export function render(path: string, content: SiteContent = staticContent) {
  const Page = pages[path];
  const isProject = path.startsWith("/work/");
  const client = new QueryClient();
  const helmetContext: { helmet?: HelmetServerState } = {};
  const html = renderToString(
    <SnapshotProvider content={content}>
      <MotionConfig reducedMotion="always">
        <LazyMotion features={domAnimation}>
          <ThemeProvider>
            <HelmetProvider context={helmetContext}>
              <StaticRouter location={path}>
                <QueryClientProvider client={client}>
                  <Layout>
                    {isProject ? (
                      <Routes>
                        <Route path="/work/:slug" element={<ProjectPage />} />
                      </Routes>
                    ) : (
                      <Page />
                    )}
                  </Layout>
                </QueryClientProvider>
              </StaticRouter>
            </HelmetProvider>
          </ThemeProvider>
        </LazyMotion>
      </MotionConfig>
    </SnapshotProvider>,
  );
  client.clear();
  return {
    html,
    head: helmetContext.helmet
      ? Object.values(helmetContext.helmet)
          .map((item) => item.toString())
          .join("\n")
      : "",
  };
}
