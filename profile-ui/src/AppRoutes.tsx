import { Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./layouts/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const WorkPage = lazy(() => import("./pages/WorkPage"));
const ProjectPage = lazy(() => import("./pages/ProjectPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsAndConditionsPage = lazy(() => import("./pages/TermsAndConditions"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const ResumePage = lazy(() => import("./pages/ResumePage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const InquiriesPage = lazy(() => import("./pages/InquiriesPage"));
import ErrorPage from "./pages/ErrorPage";
import { DEFINED_ROUTES } from "./routes";
import "./styles/pages.css";

const AppRoutes = () => {
  return (
    <Suspense
      fallback={
        <div className="studio-page page-skeleton" aria-busy="true">
          <div className="studio-container studio-page-intro">
            <p role="status" className="sr-only">
              Loading page…
            </p>
            <span
              className="skeleton-bar skeleton-bar--title"
              aria-hidden="true"
            />
            <span
              className="skeleton-bar skeleton-bar--line"
              aria-hidden="true"
            />
            <span
              className="skeleton-bar skeleton-bar--line"
              aria-hidden="true"
            />
          </div>
        </div>
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
          path={DEFINED_ROUTES.WORK_PROJECT}
          element={
            <Layout>
              <ProjectPage />
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
        <Route
          path={DEFINED_ROUTES.ACCOUNT}
          element={
            <Layout>
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path={DEFINED_ROUTES.ADMIN}
          element={
            <Layout>
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path={DEFINED_ROUTES.INQUIRIES}
          element={
            <Layout>
              <ProtectedRoute>
                <InquiriesPage />
              </ProtectedRoute>
            </Layout>
          }
        />

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
