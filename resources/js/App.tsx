import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { AuthProvider, P, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './lib/toast';
import { AppLayout, PosLayout } from './components/layout/AppLayout';
import { LoadingBlock } from './components/ui/Feedback';
import { BrandMark } from './components/layout/Brand';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PosPage } from './pages/PosPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { TrackingPage } from './pages/TrackingPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ServicesPage } from './pages/admin/ServicesPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { ActivityLogsPage } from './pages/admin/ActivityLogsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { NotFoundPage, ForbiddenPage } from './pages/NotFoundPage';

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <BrandMark className="size-12" />
        <LoadingBlock label="Starting up…" className="py-0" />
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, booting } = useAuth();
  const location = useLocation();
  if (booting) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

/** UI-level guard. The API enforces the same permission independently. */
function Can({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : <ForbiddenPage />;
}

function HomeRedirect() {
  const { can } = useAuth();
  if (can(P.DashboardView)) return <DashboardPage />;
  return <Navigate to="/tracking" replace />;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, booting } = useAuth();
  if (booting) return <Splash />;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

/**
 * Laravel serves the app shell for every non-API path (routes/web.php), so
 * clean URLs like /orders/12 keep working on refresh.
 */
export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />

              <Route path="/print/receipt/:id" element={<RequireAuth><Can permission={P.PaymentsView}><ReceiptPage /></Can></RequireAuth>} />

              <Route element={<RequireAuth><PosLayout /></RequireAuth>}>
                <Route path="/pos" element={<Can permission={P.OrdersCreate}><PosPage /></Can>} />
              </Route>

              <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                <Route index element={<HomeRedirect />} />
                <Route path="/orders" element={<Can permission={P.OrdersView}><OrdersPage /></Can>} />
                <Route path="/orders/:id" element={<Can permission={P.OrdersView}><OrderDetailPage /></Can>} />
                <Route path="/customers" element={<Can permission={P.CustomersView}><CustomersPage /></Can>} />
                <Route path="/customers/:id" element={<Can permission={P.CustomersView}><CustomerDetailPage /></Can>} />
                <Route path="/tracking" element={<Can permission={P.OrdersStatus}><TrackingPage /></Can>} />
                <Route path="/payments" element={<Can permission={P.PaymentsView}><PaymentsPage /></Can>} />
                <Route path="/services" element={<Can permission={P.ServicesManage}><ServicesPage /></Can>} />
                <Route path="/reports" element={<Can permission={P.ReportsView}><ReportsPage /></Can>} />
                <Route path="/users" element={<Can permission={P.UsersManage}><UsersPage /></Can>} />
                <Route path="/activity-logs" element={<Can permission={P.ActivityLogsView}><ActivityLogsPage /></Can>} />
                <Route path="/settings" element={<Can permission={P.SettingsManage}><SettingsPage /></Can>} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
