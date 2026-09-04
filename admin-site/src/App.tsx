import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PageErrorBoundary } from "@shared/components/shared/PageErrorBoundary";

const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })));

export function App(): JSX.Element {
  return <PageErrorBoundary>
    <Suspense fallback={<div className="status-card">正在载入后台...</div>}>
      <Routes>
        <Route path="/dashboard" element={<AdminDashboardPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  </PageErrorBoundary>;
}
