import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PublicSiteLayout } from "./layouts/PublicSiteLayout";
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { WorksPage } from "./pages/WorksPage";
import { WorkDetailPage } from "./pages/WorkDetailPage";
import { CommissionPage } from "./pages/CommissionPage";
import { SupportPage } from "./pages/SupportPage";
import { ContactPage } from "./pages/ContactPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LegacyAdminRedirectPage } from "./pages/LegacyAdminRedirectPage";

function PreviewRouter(): JSX.Element {
  const { page } = useParams();

  if (page === "about") return <PublicSiteLayout embedded><AboutPage /></PublicSiteLayout>;
  if (page === "works") return <PublicSiteLayout embedded><WorksPage /></PublicSiteLayout>;
  if (page === "commission") return <PublicSiteLayout embedded><CommissionPage /></PublicSiteLayout>;
  if (page === "support") return <PublicSiteLayout embedded><SupportPage /></PublicSiteLayout>;
  if (page === "contact") return <PublicSiteLayout embedded><ContactPage /></PublicSiteLayout>;

  return <PublicSiteLayout embedded><HomePage /></PublicSiteLayout>;
}

export function App(): JSX.Element {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PublicSiteLayout><HomePage /></PublicSiteLayout>} />
        <Route path="/about" element={<PublicSiteLayout><AboutPage /></PublicSiteLayout>} />
        <Route path="/works" element={<PublicSiteLayout><WorksPage /></PublicSiteLayout>} />
        <Route path="/works/:workId" element={<PublicSiteLayout><WorkDetailPage /></PublicSiteLayout>} />
        <Route path="/commission" element={<PublicSiteLayout><CommissionPage /></PublicSiteLayout>} />
        <Route path="/support" element={<PublicSiteLayout><SupportPage /></PublicSiteLayout>} />
        <Route path="/contact" element={<PublicSiteLayout><ContactPage /></PublicSiteLayout>} />
        <Route path="/preview/:page" element={<PreviewRouter />} />
        <Route path="/admin" element={<LegacyAdminRedirectPage />} />
        <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
        <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<PublicSiteLayout><NotFoundPage /></PublicSiteLayout>} />
      </Routes>
    </AnimatePresence>
  );
}
