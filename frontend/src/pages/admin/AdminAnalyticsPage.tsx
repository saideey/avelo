import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CalendarCheck, DollarSign, Users, Star, TrendingUp, Building2,
  MapPin, BarChart3, ArrowUpRight,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '@/shared/api/axios'
import { cn, formatPrice } from '@/shared/lib/utils'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { Badge } from '@/shared/components/Badge'

type Period = 'weekly' | 'monthly' | 'yearly'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('monthly')

  const { data: overview, isLoading } = useQuery({
    queryKey: ['aa-overview'],
    queryFn: () => api.get('/admin/analytics/overview').then(r => r.data).catch(() => ({})),
  })
  const { data: revenue } = useQuery({
    queryKey: ['aa-revenue', period],
    queryFn: () => api.get('/admin/analytics/revenue', { params: { period } }).then(r => r.data).catch(() => ({})),
  })
  const { data: bookings } = useQuery({
    queryKey: ['aa-bookings'],
    queryFn: () => api.get('/admin/analytics/bookings-chart').then(r => r.data).catch(() => ({})),
  })
  const { data: topWs } = useQuery({
    queryKey: ['aa-top'],
    queryFn: () => api.get('/admin/analytics/top-workshops').then(r => r.data).catch(() => ({})),
  })
  const { data: regions } = useQuery({
    queryKey: ['aa-regions'],
    queryFn: () => api.get('/admin/analytics/regions').then(r => r.data).catch(() => ({})),
  })

  if (isLoading) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" label="Yuklanmoqda..." /></div>

  const o = overview || {}
  const revenueChart = (revenue?.data || []).map((d: any) => ({
    period: String(d.period || '').slice(0, 7),
    revenue: d.revenue || 0,
    count: d.count || 0,
  }))
  const bookingsData = bookings?.data || []
  const topWorkshops = topWs?.data || topWs?.items || []
  const regionsData = regions?.data || regions?.items || []

  const kpis = [
    { label: 'Jami foydalanuvchilar', value: o.total_users || 0, icon: Users, gradient: 'from-blue-500 to-indigo-600', glow: 'shadow-blue-200' },
    { label: 'Ustaxonalar', value: o.total_workshops || 0, icon: Building2, gradient: 'from-violet-500 to-purple-600', glow: 'shadow-violet-200' },
    { label: 'Jami buyurtmalar', value: o.total_bookings || 0, icon: CalendarCheck, gradient: 'from-orange-500 to-red-500', glow: 'shadow-orange-200' },
    { label: 'Jami daromad', value: formatPrice(o.total_revenue || 0), icon: DollarSign, gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-200' },
  ]

  const secondaryStats = [
    { label: 'Bugungi buyurtmalar', value: o.today_bookings || 0 },
    { label: 'Bugungi yangi users', value: o.today_users || 0 },
    { label: 'Bugungi daromad', value: formatPrice(o.today_revenue || 0) },
    { label: 'Faol buyurtmalar', value: o.active_bookings || 0 },
  ]

  return (
    <motion.div className="space-y-6 p-4 md:p-6" variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Analitika</h1>
            <p className="text-sm text-gray-500">Platformaning batafsil statistikasi</p>
          </div>
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {(['weekly', 'monthly', 'yearly'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn('rounded-lg px-5 py-2 text-sm font-semibold transition-all',
                period === p ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              {p === 'weekly' ? 'Haftalik' : p === 'monthly' ? 'Oylik' : 'Yillik'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div key={i} variants={fadeUp}
            className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg', kpi.gradient, kpi.glow)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{kpi.label}</p>
                <p className="mt-1.5 text-2xl font-extrabold tracking-tight">{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</p>
              </div>
              <div className="rounded-xl bg-white/15 p-2"><kpi.icon className="h-5 w-5" /></div>
            </div>
            <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
          </motion.div>
        ))}
      </motion.div>

      {/* Secondary Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {secondaryStats.map((s, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-extrabold text-gray-900 mt-1">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Bookings */}
        <motion.div variants={fadeUp} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">Kunlik buyurtmalar (30 kun)</h2>
          {bookingsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={bookingsData}>
                <defs>
                  <linearGradient id="aaBG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#aaBG)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">Ma'lumot yo'q</div>}
        </motion.div>

        {/* Revenue */}
        <motion.div variants={fadeUp} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">Daromad ({period === 'weekly' ? 'haftalik' : period === 'monthly' ? 'oylik' : 'yillik'})</h2>
          {revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueChart} barSize={32}>
                <defs>
                  <linearGradient id="aaRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                <Tooltip formatter={(v: number) => [formatPrice(v), 'Daromad']} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="revenue" fill="url(#aaRev)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">Ma'lumot yo'q</div>}
        </motion.div>
      </div>

      {/* Top Workshops */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-base font-bold text-gray-900">Top ustaxonalar</h2>
        </div>
        {topWorkshops.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Ustaxona</th>
                  <th className="px-5 py-3">Shahar</th>
                  <th className="px-5 py-3">Buyurtmalar</th>
                  <th className="px-5 py-3">Daromad</th>
                  <th className="px-5 py-3">Reyting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topWorkshops.map((ws: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold',
                        i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                      )}>{i + 1}</span>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{ws.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{ws.city}</td>
                    <td className="px-5 py-3"><Badge variant="primary" size="sm">{ws.booking_count || ws.bookings || 0}</Badge></td>
                    <td className="px-5 py-3 text-sm font-bold text-emerald-600 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />{formatPrice(ws.total_revenue || ws.revenue || 0)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-gray-700">{(ws.rating_avg || ws.rating || 0).toFixed(1)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-12 text-center text-sm text-gray-400">Ma'lumot yo'q</div>}
      </motion.div>

      {/* Regions */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-base font-bold text-gray-900">Hududiy ko'rsatkichlar</h2>
        </div>
        {regionsData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Hudud</th>
                  <th className="px-5 py-3">Ustaxonalar</th>
                  <th className="px-5 py-3">Buyurtmalar</th>
                  <th className="px-5 py-3">Daromad</th>
                  <th className="px-5 py-3">O'rt. reyting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {regionsData.map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-blue-500" />{r.region || r.city}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{r.workshops}</td>
                    <td className="px-5 py-3"><Badge variant={r.bookings > 0 ? 'primary' : 'default'} size="sm">{r.bookings}</Badge></td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-900">{formatPrice(r.revenue || 0)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-medium">{(r.avg_rating || 0).toFixed(1)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-12 text-center text-sm text-gray-400">Ma'lumot yo'q</div>}
      </motion.div>
    </motion.div>
  )
}
