import { Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import LayoutRoute, { PageSkeleton } from "./layouts/LayoutRoute";
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
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        {/* Outside the shell: bare callback screen */}
        <Route path={DEFINED_ROUTES.AUTH_CALLBACK} element={<AuthCallback />} />

        <Route element={<LayoutRoute />}>
          {/* Public Routes */}
          <Route path={DEFINED_ROUTES.HOME} element={<HomePage />} />
          <Route path={DEFINED_ROUTES.ABOUT} element={<AboutPage />} />
          <Route path={DEFINED_ROUTES.WORK} element={<WorkPage />} />
          <Route path={DEFINED_ROUTES.WORK_PROJECT} element={<ProjectPage />} />
          <Route path={DEFINED_ROUTES.CONTACT} element={<ContactPage />} />
          <Route path={DEFINED_ROUTES.PRIVACY} element={<PrivacyPage />} />
          <Route
            path={DEFINED_ROUTES.TERMS}
            element={<TermsAndConditionsPage />}
          />

          {/* Protected Routes */}
          <Route
            path={DEFINED_ROUTES.RESUME}
            element={
              <ProtectedRoute>
                <ResumePage />
              </ProtectedRoute>
            }
          />
          <Route
            path={DEFINED_ROUTES.ACCOUNT}
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={DEFINED_ROUTES.ADMIN}
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={DEFINED_ROUTES.INQUIRIES}
            element={
              <ProtectedRoute>
                <InquiriesPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all: 404 */}
          <Route
            path="*"
            element={
              <ErrorPage
                code="404"
                message="Page not found"
                redirectPath={DEFINED_ROUTES.HOME}
                autoRedirect={false}
              />
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
