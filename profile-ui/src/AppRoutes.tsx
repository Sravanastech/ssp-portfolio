import { Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./layouts/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const WorkPage = lazy(() => import("./pages/WorkPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsAndConditionsPage = lazy(() => import("./pages/TermsAndConditions"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const ResumePage = lazy(() => import("./pages/ResumePage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const InquiriesPage = lazy(() => import("./pages/InquiriesPage"));
import ErrorPage from "./pages/ErrorPage";

// Defined application routes whitelist
export const DEFINED_ROUTES = {
  HOME: "/",
  AUTH_CALLBACK: "/auth-callback",
  RESUME: "/resume",
  ABOUT: "/about",
  WORK: "/work",
  CONTACT: "/contact",
  PRIVACY: "/privacy",
  TERMS: "/termsconditions",
  ACCOUNT: "/account",
  ADMIN: "/admin",
  INQUIRIES: "/admin/inquiries",
} as const;

const AppRoutes = () => {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8">
          Loading page…
        </p>
      }
    >
      <Routes>
        {/* Public Routes */}
        <Route
          path={DEFINED_ROUTES.HOME}
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />
        <Route path={DEFINED_ROUTES.AUTH_CALLBACK} element={<AuthCallback />} />
        <Route
          path={DEFINED_ROUTES.ABOUT}
          element={
            <Layout>
              <AboutPage />
            </Layout>
          }
        />
        <Route
          path={DEFINED_ROUTES.WORK}
          element={
            <Layout>
              <WorkPage />
            </Layout>
          }
        />
        <Route
          path={DEFINED_ROUTES.CONTACT}
          element={
            <Layout>
              <ContactPage />
            </Layout>
          }
        />
        <Route
          path={DEFINED_ROUTES.PRIVACY}
          element={
            <Layout>
              <PrivacyPage />
            </Layout>
          }
        />
        <Route
          path={DEFINED_ROUTES.TERMS}
          element={
            <Layout>
              <TermsAndConditionsPage />
            </Layout>
          }
        />

        {/* Protected Routes */}
        <Route
          path={DEFINED_ROUTES.RESUME}
          element={
            <Layout>
              <ProtectedRoute>
                <ResumePage />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route path={DEFINED_ROUTES.ACCOUNT} element={<Layout><ProtectedRoute><AccountPage /></ProtectedRoute></Layout>} />
        <Route path={DEFINED_ROUTES.ADMIN} element={<Layout><ProtectedRoute><AdminPage /></ProtectedRoute></Layout>} />
        <Route path={DEFINED_ROUTES.INQUIRIES} element={<Layout><ProtectedRoute><InquiriesPage /></ProtectedRoute></Layout>} />

        {/* Catch-all: 404 */}
        <Route
          path="*"
          element={
            <Layout>
              <ErrorPage
                code="404"
                message="Page not found"
                redirectPath={DEFINED_ROUTES.HOME}
                autoRedirect={false}
              />
            </Layout>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
