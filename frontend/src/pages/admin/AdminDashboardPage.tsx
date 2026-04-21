import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  MessageSquareWarning,
  Star,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '@/shared/api/axios';
import { cn, formatPrice } from '@/shared/lib/utils';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { Badge } from '@/shared/components/Badge';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.get('/admin/analytics/overview').then((r) => r.data).catch(() => null),
  });

  const { data: bookingsChart } = useQuery({
    queryKey: ['admin-bookings-chart'],
    queryFn: () => api.get('/admin/analytics/bookings-chart').then((r) => r.data?.data || []).catch(() => []),
  });

  const { data: recentBookings } = useQuery({
    queryKey: ['admin-recent-bookings'],
    queryFn: () => api.get('/admin/bookings', { params: { limit: 5 } }).then((r) => r.data?.items || []).catch(() => []),
  });

  const { data: complaints } = useQuery({
    queryKey: ['admin-open-complaints'],
    queryFn: () => api.get('/admin/complaints', { params: { status: 'open', limit: 5 } }).then((r) => r.data?.items || []).catch(() => []),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" label="Yuklanmoqda..." />
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Jami foydalanuvchilar',
      value: overview?.total_users ?? 0,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Ustaxonalar soni',
      value: overview?.total_workshops ?? 0,
      icon: Building2,
      gradient: 'from-violet-500 to-violet-600',
    },
    {
      label: 'Bugungi buyurtmalar',
      value: overview?.today_bookings ?? 0,
      icon: CalendarCheck,
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      label: 'Bugungi daromad',
      value: formatPrice(overview?.today_revenue ?? 0),
      icon: DollarSign,
      gradient: 'from-emerald-500 to-emerald-600',
    },
  ];

  const statCards = [
    {
      label: 'Jami buyurtmalar',
      value: overview?.total_bookings ?? 0,
      icon: TrendingUp,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Faol buyurtmalar',
      value: overview?.active_bookings ?? 0,
      icon: CalendarCheck,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Umumiy daromad',
      value: formatPrice(overview?.total_revenue ?? 0),
      icon: DollarSign,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Bugungi yangi foydalanuvchilar',
      value: overview?.today_users ?? 0,
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  const quickLinks = [
    { label: 'Shikoyatlar', path: '/admin/complaints', icon: MessageSquareWarning, count: complaints?.length || 0, color: 'text-red-500' },
    { label: 'Sharhlar', path: '/admin/reviews', icon: Star, color: 'text-amber-500' },
    { label: 'Kafolatlar', path: '/admin/warranty-claims', icon: ShieldAlert, color: 'text-purple-500' },
    { label: 'Analitika', path: '/admin/analytics', icon: TrendingUp, color: 'text-blue-500' },
  ];

  const statusLabels: Record<string, string> = {
    pending: 'Kutilmoqda',
    confirmed: 'Tasdiqlangan',
    in_progress: 'Jarayonda',
    completed: 'Tugallangan',
    cancelled: 'Bekor',
  };

  return (
    <motion.div className="space-y-6 p-4 md:p-6" variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-1 text-sm text-gray-500">Platformaning umumiy ko'rinishi</p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={containerVariants}>
        {kpiCards.map((card, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            className={cn('relative overflow-hidden rounded-xl bg-gradient-to-br p-6 text-white shadow-lg', card.gradient)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">{card.label}</p>
                <p className="mt-2 text-2xl font-bold">{card.value}</p>
              </div>
              <div className="rounded-lg bg-white/20 p-2">
                <card.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
          </motion.div>
        ))}
      </motion.div>

      {/* Secondary Stats */}
      <motion.div className="grid grid-cols-2 gap-4 lg:grid-cols-4" variants={containerVariants}>
        {statCards.map((card, i) => (
          <motion.div key={i} variants={itemVariants} className="rounded-xl bg-white border border-gray-100 p-4">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', card.color)}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{card.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bookings Chart */}
        <motion.div className="lg:col-span-2 rounded-xl border border-gray-100 bg-white p-6 shadow-sm" variants={itemVariants}>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Kunlik buyurtmalar (30 kun)</h2>
          {bookingsChart?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={bookingsChart}>
                <defs>
                  <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#bookGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
              Hozircha ma'lumotlar yo'q
            </div>
          )}
        </motion.div>

        {/* Quick Links */}
        <motion.div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm" variants={itemVariants}>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Tez harakatlar</h2>
          <div className="space-y-3">
            {quickLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <link.icon className={cn('w-5 h-5', link.color)} />
                <span className="flex-1 text-sm font-medium text-gray-700">{link.label}</span>
                {link.count ? (
                  <Badge variant="danger">{link.count}</Badge>
                ) : null}
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Bookings Table */}
      <motion.div className="rounded-xl border border-gray-100 bg-white shadow-sm" variants={itemVariants}>
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900">So'nggi buyurtmalar</h2>
          <button onClick={() => navigate('/admin/bookings')} className="text-sm text-primary-500 hover:underline">
            Hammasini ko'rish
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Holat</th>
                <th className="px-6 py-3">Narx</th>
                <th className="px-6 py-3">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentBookings?.length ? recentBookings.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-mono text-gray-500">{b.id?.slice(0, 8)}...</td>
                  <td className="px-6 py-3">
                    <Badge variant={b.status === 'completed' ? 'success' : b.status === 'pending' ? 'warning' : 'default'}>
                      {statusLabels[b.status] || b.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900">{formatPrice(b.total_price || 0)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{b.created_at ? new Date(b.created_at).toLocaleDateString('uz') : '-'}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">Buyurtmalar yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
