import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import { SiteLayout } from "./layouts/SiteLayout";
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { WorksPage } from "./pages/WorksPage";
import { WorkDetailPage } from "./pages/WorkDetailPage";
import { CommissionPage } from "./pages/CommissionPage";
import { SupportPage } from "./pages/SupportPage";
import { ContactPage } from "./pages/ContactPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";

function ProtectedRoute({ children }: { children: JSX.Element }): JSX.Element {
  const auth = useAuth();

  if (auth.loading) {
    return <div className="status-card">正在检查访问权限...</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

function PreviewRouter(): JSX.Element {
  const { page } = useParams();

  if (page === "about") {
    return <SiteLayout embedded><AboutPage /></SiteLayout>;
  }

  if (page === "works") {
    return <SiteLayout embedded><WorksPage /></SiteLayout>;
  }

  if (page === "commission") {
    return <SiteLayout embedded><CommissionPage /></SiteLayout>;
  }

  if (page === "support") {
    return <SiteLayout embedded><SupportPage /></SiteLayout>;
  }

  if (page === "contact") {
    return <SiteLayout embedded><ContactPage /></SiteLayout>;
  }

  return <SiteLayout embedded><HomePage /></SiteLayout>;
}

export function App(): JSX.Element {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<SiteLayout><HomePage /></SiteLayout>} />
        <Route path="/about" element={<SiteLayout><AboutPage /></SiteLayout>} />
        <Route path="/works" element={<SiteLayout><WorksPage /></SiteLayout>} />
        <Route path="/works/:workId" element={<SiteLayout><WorkDetailPage /></SiteLayout>} />
        <Route path="/commission" element={<SiteLayout><CommissionPage /></SiteLayout>} />
        <Route path="/support" element={<SiteLayout><SupportPage /></SiteLayout>} />
        <Route path="/contact" element={<SiteLayout><ContactPage /></SiteLayout>} />
        <Route path="/preview/:page" element={<PreviewRouter />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
        <Route path="*" element={<SiteLayout><NotFoundPage /></SiteLayout>} />
      </Routes>
    </AnimatePresence>
  );
}
