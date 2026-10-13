import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import type { HelmetServerState } from "react-helmet-async";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "./theme/ThemeContext";
import Layout from "./layouts/Layout";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import WorkPage from "./pages/WorkPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsAndConditions from "./pages/TermsAndConditions";
import { publicMetadata } from "./components/PageMetadata";
import { SnapshotProvider, staticContent, type SiteContent } from "./content/SiteContent";

const pages = {
  "/": HomePage,
  "/about": AboutPage,
  "/work": WorkPage,
  "/contact": ContactPage,
  "/privacy": PrivacyPage,
  "/termsconditions": TermsAndConditions,
};
export const routes = Object.keys(publicMetadata);

export function render(path: keyof typeof pages, content: SiteContent = staticContent) {
  const Page = pages[path];
  const client = new QueryClient();
  const helmetContext: { helmet?: HelmetServerState } = {};
  const html = renderToString(
    <SnapshotProvider content={content}><MotionConfig reducedMotion="always">
      <ThemeProvider>
        <HelmetProvider context={helmetContext}>
          <StaticRouter location={path}>
            <QueryClientProvider client={client}>
              <Layout>
                <Page />
              </Layout>
            </QueryClientProvider>
          </StaticRouter>
        </HelmetProvider>
      </ThemeProvider>
    </MotionConfig></SnapshotProvider>,
  );
  client.clear();
  return {
    html,
    head: helmetContext.helmet ? Object.values(helmetContext.helmet).map((item) => item.toString()).join("\n") : "",
  };
}
