import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  DollarSign, TrendingUp, Percent, ShoppingCart, Wallet,
  Calendar, CreditCard, Banknote, ArrowUpRight, ArrowDownRight,
  FileText, Download, BarChart3,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import api from '@/shared/api/axios'
import { cn, formatPrice } from '@/shared/lib/utils'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { Badge } from '@/shared/components/Badge'

type Period = 'weekly' | 'monthly' | 'yearly'

const periodLabels: Record<Period, string> = {
  weekly: 'Haftalik',
  monthly: 'Oylik',
  yearly: 'Yillik',
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function PartnerFinancePage() {
  const [period, setPeriod] = useState<Period>('monthly')

  const { data, isLoading } = useQuery({
    queryKey: ['partner-finance', period],
    queryFn: () => api.get('/partner/finance/summary', { params: { period } }).then(r => r.data).catch(() => null),
  })

  const { data: commissionData } = useQuery({
    queryKey: ['partner-commission', period],
    queryFn: () => api.get('/partner/finance/commission', { params: { period, limit: 10 } }).then(r => r.data).catch(() => null),
  })

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" label="Yuklanmoqda..." /></div>
  }

  const totalRevenue = data?.total_revenue ?? 0
  const totalCommission = data?.total_commission ?? 0
  const netIncome = data?.net_income ?? 0
  const avgPerBooking = data?.avg_per_booking ?? 0
  const totalBookings = data?.total_bookings ?? 0
  const commissionPercent = data?.commission_percent ?? 10
  const dailyBreakdown = data?.daily_breakdown ?? []
  const paymentMethods = data?.payment_method_breakdown ?? []
  const commissionItems = commissionData?.items ?? commissionData ?? []

  // Prepare chart data
  const revenueChart = dailyBreakdown.map((d: any) => ({
    date: d.date?.slice(5) || d.date,
    daromad: d.revenue || 0,
    buyurtmalar: d.bookings || d.count || 0,
  }))

  // Payment methods for pie chart
  const pieData = (Array.isArray(paymentMethods) ? paymentMethods : []).map((p: any) => ({
    name: p.method === 'CASH' ? 'Naqd' : p.method === 'CARD' ? 'Karta' : p.method || 'Boshqa',
    value: p.amount || p.count || 0,
    count: p.count || 0,
  }))

  const kpis = [
    { label: 'Umumiy daromad', value: formatPrice(totalRevenue), sub: `${totalBookings} ta buyurtma`, icon: DollarSign, gradient: 'from-blue-500 to-indigo-600', iconBg: 'bg-blue-400/30' },
    { label: `Komissiya (${commissionPercent}%)`, value: formatPrice(totalCommission), sub: 'Platforma ulushi', icon: Percent, gradient: 'from-rose-500 to-pink-600', iconBg: 'bg-rose-400/30' },
    { label: 'Sof foyda', value: formatPrice(netIncome), sub: totalRevenue > 0 ? `${Math.round((netIncome / totalRevenue) * 100)}% marjinallik` : '', icon: Wallet, gradient: 'from-emerald-500 to-teal-600', iconBg: 'bg-emerald-400/30' },
    { label: "O'rtacha buyurtma", value: formatPrice(avgPerBooking), sub: 'Buyurtma boshiga', icon: ShoppingCart, gradient: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-400/30' },
  ]

  // Summary stats
  const profitMargin = totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 100) : 0
  const avgDaily = dailyBreakdown.length > 0 ? Math.round(totalRevenue / dailyBreakdown.length) : 0

  return (
    <motion.div className="space-y-6 p-4 md:p-6" variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Moliyaviy Hisobot</h1>
            <p className="text-sm text-gray-500">Daromad, xarajat va foyda tahlili</p>
          </div>
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-lg px-5 py-2.5 text-sm font-medium transition-all',
                period === p ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={stagger}>
        {kpis.map((kpi, i) => (
          <motion.div key={i} variants={fadeUp}
            className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg', kpi.gradient)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">{kpi.label}</p>
                <p className="mt-1.5 text-2xl font-extrabold tracking-tight">{kpi.value}</p>
                {kpi.sub && <p className="mt-1 text-xs text-white/60">{kpi.sub}</p>}
              </div>
              <div className={cn('rounded-xl p-2.5', kpi.iconBg)}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-white/5" />
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Calendar className="h-3.5 w-3.5" /> Kunlik o'rtacha
          </div>
          <p className="text-lg font-bold text-gray-900">{formatPrice(avgDaily)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <TrendingUp className="h-3.5 w-3.5" /> Foyda marjasi
          </div>
          <p className="text-lg font-bold text-emerald-600">{profitMargin}%</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Banknote className="h-3.5 w-3.5" /> Jami to'lovlar
          </div>
          <p className="text-lg font-bold text-gray-900">{totalBookings} ta</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <CreditCard className="h-3.5 w-3.5" /> To'lov usullari
          </div>
          <p className="text-lg font-bold text-gray-900">{pieData.length} xil</p>
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue + Bookings Chart */}
        <motion.div variants={fadeUp} className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Daromad dinamikasi</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Daromad</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Buyurtmalar</span>
            </div>
          </div>
          {revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip formatter={(value: number, name: string) => [formatPrice(value), name === 'daromad' ? 'Daromad' : 'Buyurtmalar']} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.08)' }} />
                <Area type="monotone" dataKey="daromad" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center text-gray-400">
              <BarChart3 className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Tanlangan davr uchun ma'lumot yo'q</p>
            </div>
          )}
        </motion.div>

        {/* Payment Methods Donut */}
        <motion.div variants={fadeUp} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">To'lov usullari</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" nameKey="name">
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatPrice(value), '']} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
                {pieData.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-700">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">{p.count} ta</span>
                      <span className="font-semibold text-gray-900">{formatPrice(p.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center text-gray-400">
              <CreditCard className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">To'lovlar yo'q</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Daily Breakdown Table */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Kunlik tafsilot</h2>
            <p className="text-xs text-gray-500 mt-0.5">{dailyBreakdown.length} kun</p>
          </div>
          <button className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Download className="h-4 w-4" /> Eksport
          </button>
        </div>
        {dailyBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Sana</th>
                  <th className="px-6 py-3">Buyurtmalar</th>
                  <th className="px-6 py-3">Daromad</th>
                  <th className="px-6 py-3">Komissiya</th>
                  <th className="px-6 py-3">Sof foyda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dailyBreakdown.map((row: any, i: number) => {
                  const rev = row.revenue || 0
                  const comm = Math.round(rev * 0.1)
                  const net = rev - comm
                  return (
                    <tr key={i} className="transition-colors hover:bg-blue-50/30">
                      <td className="whitespace-nowrap px-6 py-3.5 text-sm font-medium text-gray-900">
                        {row.date ? new Date(row.date).toLocaleDateString('uz', { day: 'numeric', month: 'short' }) : '-'}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge variant="primary" size="sm">{row.bookings || row.count || 0}</Badge>
                      </td>
                      <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">
                        <span className="flex items-center gap-1">
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                          {formatPrice(rev)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-rose-600">
                        <span className="flex items-center gap-1">
                          <ArrowDownRight className="h-3.5 w-3.5" />
                          {formatPrice(comm)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm font-semibold text-emerald-600">{formatPrice(net)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-6 py-3.5 text-sm font-bold text-gray-900">Jami</td>
                  <td className="px-6 py-3.5"><Badge variant="primary">{totalBookings}</Badge></td>
                  <td className="px-6 py-3.5 text-sm font-bold text-gray-900">{formatPrice(totalRevenue)}</td>
                  <td className="px-6 py-3.5 text-sm font-bold text-rose-600">{formatPrice(totalCommission)}</td>
                  <td className="px-6 py-3.5 text-sm font-bold text-emerald-600">{formatPrice(netIncome)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="flex h-40 flex-col items-center justify-center text-gray-400">
            <FileText className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Tanlangan davr uchun ma'lumot yo'q</p>
          </div>
        )}
      </motion.div>

      {/* Commission Details */}
      {Array.isArray(commissionItems) && commissionItems.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Komissiya tafsiloti</h2>
            <p className="text-xs text-gray-500 mt-0.5">Oxirgi 10 buyurtma</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Buyurtma ID</th>
                  <th className="px-6 py-3">Summa</th>
                  <th className="px-6 py-3">Komissiya</th>
                  <th className="px-6 py-3">Siz olasiz</th>
                  <th className="px-6 py-3">Sana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {commissionItems.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-mono text-gray-500">{String(item.booking_id || item.id || '').slice(0, 8)}...</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{formatPrice(item.amount || item.total_price || 0)}</td>
                    <td className="px-6 py-3 text-sm text-rose-600">{formatPrice(item.commission || 0)}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-emerald-600">{formatPrice(item.net || (item.amount || 0) - (item.commission || 0))}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{item.date || item.paid_at ? new Date(item.date || item.paid_at).toLocaleDateString('uz') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
