import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";

function ProtectedRoute({ children }: { children: JSX.Element }): JSX.Element {
  const auth = useAuth();

  if (auth.loading) {
    return <div className="status-card">正在检查后台权限...</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RootRoute(): JSX.Element {
  const auth = useAuth();

  if (auth.loading) {
    return <div className="status-card">正在载入后台...</div>;
  }

  return <Navigate to={auth.isAuthenticated ? "/dashboard" : "/login"} replace />;
}

export function App(): JSX.Element {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
