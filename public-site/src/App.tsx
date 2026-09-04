import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import { PageTransition } from "@shared/components/shared/PageTransition";
import { PublicSiteLayout } from "./layouts/PublicSiteLayout";
import { PageErrorBoundary } from "@shared/components/shared/PageErrorBoundary";
import { HomePage } from "./pages/HomePage";

const AboutPage = lazy(() => import("./pages/AboutPage").then((module) => ({ default: module.AboutPage })));
const WorksPage = lazy(() => import("./pages/WorksPage").then((module) => ({ default: module.WorksPage })));
const WorkDetailPage = lazy(() => import("./pages/WorkDetailPage").then((module) => ({ default: module.WorkDetailPage })));
const CommissionPage = lazy(() => import("./pages/CommissionPage").then((module) => ({ default: module.CommissionPage })));
const SupportPage = lazy(() => import("./pages/SupportPage").then((module) => ({ default: module.SupportPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((module) => ({ default: module.ContactPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const LegacyAdminRedirectPage = lazy(() => import("./pages/LegacyAdminRedirectPage").then((module) => ({ default: module.LegacyAdminRedirectPage })));

function PreviewRouter(): JSX.Element {
  const { page } = useParams();

  if (page === "about") return <AboutPage />;
  if (page === "works") return <WorksPage />;
  if (page === "commission") return <CommissionPage />;
  if (page === "support") return <SupportPage />;
  if (page === "contact") return <ContactPage />;

  return <HomePage />;
}

export function App(): JSX.Element {
  const location = useLocation();
  const embedded = location.pathname.startsWith("/preview/");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <PublicSiteLayout embedded={embedded}>
      <PageErrorBoundary key={location.pathname}>
      <Suspense fallback={<section className="status-card">页面加载中...</section>}>
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/works" element={<WorksPage />} />
              <Route path="/works/:workId" element={<WorkDetailPage />} />
              <Route path="/commission" element={<CommissionPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/preview/:page" element={<PreviewRouter />} />
              <Route path="/admin" element={<LegacyAdminRedirectPage />} />
              <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
              <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </PageTransition>
        </AnimatePresence>
      </Suspense>
      </PageErrorBoundary>
    </PublicSiteLayout>
  );
}
