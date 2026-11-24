import { Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import LayoutRoute, { PageSkeleton } from "./layouts/LayoutRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import { routeComponent } from "./lib/routeComponent";
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AboutPage = routeComponent("/about");
const WorkPage = routeComponent("/work");
const ProjectPage = routeComponent("/work/:slug");
const PrivacyPage = routeComponent("/privacy");
const TermsAndConditionsPage = routeComponent("/termsconditions");
const ContactPage = routeComponent("/contact");
const ResumePage = routeComponent("/resume");
const AccountPage = lazy(() => import("./pages/AccountPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminShell = lazy(() => import("./admin/AdminShell"));
const TeamPage = lazy(() => import("./admin/TeamPage"));
const AuditPage = lazy(() => import("./admin/AuditPage"));
const InviteAcceptPage = lazy(() => import("./admin/InviteAcceptPage"));
const InquiriesPage = lazy(() => import("./pages/InquiriesPage"));
import ErrorPage from "./pages/ErrorPage";
import { DEFINED_ROUTES } from "./routes";
import "./styles/pages.css";
// Shared by the prerendered /work pages: eager so they are styled before hydration.
import "./styles/project-page.css";

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

          {/* Resume: gated in-page (email code or Auth0), not by ProtectedRoute */}
          <Route path={DEFINED_ROUTES.RESUME} element={<ResumePage />} />

          {/* Protected Routes */}
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
              <ProtectedRoute mfa>
                <AdminShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="audit" element={<AuditPage />} />
          </Route>
          {/* Invite acceptance handles its own sign-in so the #token fragment survives. */}
          <Route
            path={DEFINED_ROUTES.ADMIN_INVITE}
            element={<InviteAcceptPage />}
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
