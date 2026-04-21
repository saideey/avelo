import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Navbar } from '@/shared/components/Navbar';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useAuth } from '@/shared/hooks/useAuth';

/* ---------- lazy pages ---------- */
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'));
const VerifyOtpPage = React.lazy(() => import('@/pages/auth/VerifyOtpPage'));
const RegisterPage = React.lazy(() => import('@/pages/auth/RegisterPage'));

const HomePage = React.lazy(() => import('@/pages/customer/HomePage'));
const SearchPage = React.lazy(() => import('@/pages/customer/SearchPage'));
const WorkshopDetailPage = React.lazy(() => import('@/pages/customer/WorkshopDetailPage'));
const BookingConfirmPage = React.lazy(() => import('@/pages/customer/BookingConfirmPage'));
const BookingsPage = React.lazy(() => import('@/pages/customer/BookingsPage'));
const BookingDetailPage = React.lazy(() => import('@/pages/customer/BookingDetailPage'));
const ProfilePage = React.lazy(() => import('@/pages/customer/ProfilePage'));
const CashbackPage = React.lazy(() => import('@/pages/customer/CashbackPage'));
const WarrantiesPage = React.lazy(() => import('@/pages/customer/WarrantiesPage'));
const PartsPage = React.lazy(() => import('@/pages/customer/PartsPage'));
const PartDetailPage = React.lazy(() => import('@/pages/customer/PartDetailPage'));
const PaymentPage = React.lazy(() => import('@/pages/customer/PaymentPage'));
const FavoritesPage = React.lazy(() => import('@/pages/customer/FavoritesPage'));
const ComplaintPage = React.lazy(() => import('@/pages/customer/ComplaintPage'));

const PartnerDashboard = React.lazy(() => import('@/pages/partner/PartnerDashboardPage'));
const PartnerBookings = React.lazy(() => import('@/pages/partner/PartnerBookingsPage'));
const PartnerReviews = React.lazy(() => import('@/pages/partner/PartnerReviewsPage'));
const PartnerFinance = React.lazy(() => import('@/pages/partner/PartnerFinancePage'));
const PartnerParts = React.lazy(() => import('@/pages/partner/PartnerPartsPage'));
const PartnerCustomers = React.lazy(() => import('@/pages/partner/PartnerCustomersPage'));
const PartnerWarranty = React.lazy(() => import('@/pages/partner/PartnerWarrantyPage'));
const PartnerAnalytics = React.lazy(() => import('@/pages/partner/PartnerAnalyticsPage'));
const PartnerSettings = React.lazy(() => import('@/pages/partner/PartnerSettingsPage'));
const PartnerSubscription = React.lazy(() => import('@/pages/partner/PartnerSubscriptionPage'));

const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsers = React.lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminWorkshops = React.lazy(() => import('@/pages/admin/AdminWorkshopsPage'));
const AdminPayments = React.lazy(() => import('@/pages/admin/AdminPaymentsPage'));
const AdminWarrantyClaims = React.lazy(() => import('@/pages/admin/AdminWarrantyClaimsPage'));
const AdminParts = React.lazy(() => import('@/pages/admin/AdminPartsPage'));
const AdminReviews = React.lazy(() => import('@/pages/admin/AdminReviewsPage'));
const AdminPartOrders = React.lazy(() => import('@/pages/admin/AdminPartOrdersPage'));
const AdminComplaints = React.lazy(() => import('@/pages/admin/AdminComplaintsPage'));
const AdminSettings = React.lazy(() => import('@/pages/admin/AdminSettingsPage'));
const AdminAnalytics = React.lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminManagement = React.lazy(() => import('@/pages/admin/AdminManagementPage'));
const AdminAuditLogs = React.lazy(() => import('@/pages/admin/AdminAuditLogsPage'));

/* ---------- fallback ---------- */
const PageFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <LoadingSpinner size="lg" label="Yuklanmoqda..." />
  </div>
);

/* ---------- helpers ---------- */
const ADMIN_ROLES = ['admin', 'super_admin', 'regional_admin', 'moderator'];

function getHomeForRole(role?: string): string {
  if (!role) return '/login';
  if (ADMIN_ROLES.includes(role)) return '/admin';
  if (role === 'partner') return '/partner';
  return '/';
}

/* ---------- protected route ---------- */
function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeForRole(user.role)} replace />;
  }

  return <Outlet />;
}

function CatchAllRedirect() {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getHomeForRole(user?.role)} replace />;
}

/* ---------- layouts ---------- */
function MobileHeader() {
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
      <img src="/avelo-logo.svg" alt="AVELO" className="h-7" />
    </header>
  );
}

function CustomerLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader />
      <Navbar role="customer" />
      <main className="pb-20 md:pb-4 md:pt-16">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function PartnerLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader />
      <Navbar role="partner" />
      <main className="pb-20 md:pb-4 md:pt-16">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader />
      <Navbar role="admin" />
      <main className="pb-20 md:pb-4 md:pt-16">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

/* ---------- app ---------- */
export default function App() {
  const { isAuthenticated, fetchUser } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
    }
  }, [isAuthenticated, fetchUser]);

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* customer */}
        <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
          <Route element={<CustomerLayout />}>
            <Route index element={<HomePage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="workshop/:slug" element={<WorkshopDetailPage />} />
            <Route path="booking/confirm" element={<BookingConfirmPage />} />
            <Route path="booking/payment" element={<PaymentPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="bookings/:id" element={<BookingDetailPage />} />
            <Route path="warranties" element={<WarrantiesPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="cashback" element={<CashbackPage />} />
            <Route path="parts" element={<PartsPage />} />
            <Route path="parts/:id" element={<PartDetailPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="complaints" element={<ComplaintPage />} />
          </Route>
        </Route>

        {/* partner */}
        <Route element={<ProtectedRoute allowedRoles={['partner']} />}>
          <Route element={<PartnerLayout />}>
            <Route path="partner" element={<PartnerDashboard />} />
            <Route path="partner/bookings" element={<PartnerBookings />} />
            <Route path="partner/reviews" element={<PartnerReviews />} />
            <Route path="partner/finance" element={<PartnerFinance />} />
            <Route path="partner/customers" element={<PartnerCustomers />} />
            <Route path="partner/parts" element={<PartnerParts />} />
            <Route path="partner/warranty" element={<PartnerWarranty />} />
            <Route path="partner/analytics" element={<PartnerAnalytics />} />
            <Route path="partner/settings" element={<PartnerSettings />} />
            <Route path="partner/subscription" element={<PartnerSubscription />} />
          </Route>
        </Route>

        {/* admin */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'regional_admin', 'moderator']} />}>
          <Route element={<AdminLayout />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/workshops" element={<AdminWorkshops />} />
            <Route path="admin/payments" element={<AdminPayments />} />
            <Route path="admin/warranty-claims" element={<AdminWarrantyClaims />} />
            <Route path="admin/parts" element={<AdminParts />} />
            <Route path="admin/part-orders" element={<AdminPartOrders />} />
            <Route path="admin/reviews" element={<AdminReviews />} />
            <Route path="admin/complaints" element={<AdminComplaints />} />
            <Route path="admin/settings" element={<AdminSettings />} />
            <Route path="admin/analytics" element={<AdminAnalytics />} />
            <Route path="admin/admins" element={<AdminManagement />} />
            <Route path="admin/audit-logs" element={<AdminAuditLogs />} />
          </Route>
        </Route>

        {/* catch-all */}
        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
    </Suspense>
  );
}
