import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  CalendarCheck,
  BarChart3,
  Star,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import api from '@/shared/api/axios';
import { cn, formatPrice } from '@/shared/lib/utils';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

interface AnalyticsData {
  total_revenue: number;
  avg_per_booking: number;
  total_bookings: number;
  growth_percent: number;
  revenue_chart: { date: string; revenue: number }[];
  services_breakdown: { name: string; count: number; revenue: number }[];
  rating_trend: { date: string; rating: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const periods = [
  { key: 'weekly', label: 'Haftalik' },
  { key: 'monthly', label: 'Oylik' },
  { key: 'yearly', label: 'Yillik' },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const PartnerAnalyticsPage: React.FC = () => {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['partner-analytics', period],
    queryFn: async () => {
      const periodMap: Record<string, string> = { weekly: 'week', monthly: 'month', yearly: 'year' };
      const { data } = await api.get('/partner/analytics', {
        params: { period: periodMap[period] || period },
      }).catch(() => ({ data: null }));
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" label="Yuklanmoqda..." />
      </div>
    );
  }

  const summaryStats = [
    {
      label: 'Jami daromad',
      value: formatPrice(data?.total_revenue ?? 0),
      icon: <DollarSign className="h-5 w-5" />,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: "O'rtacha buyurtma",
      value: formatPrice(data?.avg_per_booking ?? 0),
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Jami buyurtmalar',
      value: data?.total_bookings ?? 0,
      icon: <CalendarCheck className="h-5 w-5" />,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: "O'sish",
      value: `${(data?.growth_percent ?? 0) >= 0 ? '+' : ''}${data?.growth_percent ?? 0}%`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: (data?.growth_percent ?? 0) >= 0
        ? 'text-emerald-600 bg-emerald-50'
        : 'text-red-600 bg-red-50',
    },
  ];

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analitika</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ustaxona statistikasi va tahlili
          </p>
        </div>

        {/* Period Tabs */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-all',
                period === p.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
      >
        {summaryStats.map((stat, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2.5', stat.color)}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Revenue Chart */}
      <motion.div
        className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
        variants={itemVariants}
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Daromad grafigi
        </h2>
        {data?.revenue_chart?.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data.revenue_chart}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                formatter={(value: number) => [formatPrice(value), 'Daromad']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[320px] items-center justify-center text-sm text-gray-400">
            Ma'lumotlar yo'q
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Services Pie Chart */}
        <motion.div
          className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          variants={itemVariants}
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Xizmatlar taqsimoti
          </h2>
          {data?.services_breakdown?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.services_breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="name"
                >
                  {data.services_breakdown.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} ta`,
                    name,
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
              Ma'lumotlar yo'q
            </div>
          )}
        </motion.div>

        {/* Top Services List */}
        <motion.div
          className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          variants={itemVariants}
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Top xizmatlar
          </h2>
          {data?.services_breakdown?.length ? (
            <div className="space-y-3">
              {[...data.services_breakdown]
                .sort((a, b) => b.count - a.count)
                .map((service, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {service.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {service.count} ta
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPrice(service.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
              Ma'lumotlar yo'q
            </div>
          )}
        </motion.div>
      </div>

      {/* Rating Trend */}
      <motion.div
        className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
        variants={itemVariants}
      >
        <div className="mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Reyting dinamikasi
          </h2>
        </div>
        {data?.rating_trend?.length ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.rating_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis
                domain={[0, 5]}
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <Tooltip
                formatter={(value: number) => [value.toFixed(1), 'Reyting']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
              />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
            Ma'lumotlar yo'q
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PartnerAnalyticsPage;
