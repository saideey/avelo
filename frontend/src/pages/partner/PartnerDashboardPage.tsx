import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CalendarCheck, Clock, DollarSign, Star, TrendingUp, Users,
  ArrowRight, MessageSquare, Wallet, Package, Shield, Sparkles,
  Banknote, Phone, Calendar, CheckCircle, Play, MapPin,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '@/shared/api/axios'
import { cn, formatPrice } from '@/shared/lib/utils'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { Badge } from '@/shared/components/Badge'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-amber-400 animate-pulse',
  confirmed: 'bg-blue-400',
  in_progress: 'bg-orange-400 animate-pulse',
  completed: 'bg-emerald-400',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Yangi',
  confirmed: 'Tasdiqlangan',
  in_progress: 'Jarayonda',
  completed: 'Bajarildi',
}

export default function PartnerDashboardPage() {
  const navigate = useNavigate()

  const { data: d, isLoading } = useQuery({
    queryKey: ['partner-dashboard'],
    queryFn: () => api.get('/partner/dashboard').then(r => r.data).catch(() => null),
  })

  const { data: reviewsData } = useQuery({
    queryKey: ['partner-reviews-summary'],
    queryFn: () => api.get('/partner/reviews', { params: { limit: 3 } }).then(r => r.data).catch(() => ({ items: [] })),
  })

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" label="Yuklanmoqda..." /></div>
  }

  const recentReviews = reviewsData?.items || []

  const quickLinks = [
    { label: 'Buyurtmalar', desc: 'Barcha buyurtmalar', icon: CalendarCheck, to: '/partner/bookings', gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-200' },
    { label: 'Sharhlar', desc: `${d?.total_reviews || 0} ta sharh`, icon: MessageSquare, to: '/partner/reviews', gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-200' },
    { label: 'Moliya', desc: 'Hisobotlar', icon: Wallet, to: '/partner/finance', gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-200' },
    { label: 'Mijozlar', desc: 'Boshqaruv', icon: Users, to: '/partner/customers', gradient: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-200' },
    { label: 'Qismlar', desc: 'Buyurtma', icon: Package, to: '/partner/parts', gradient: 'from-cyan-500 to-blue-600', shadow: 'shadow-cyan-200' },
    { label: 'Kafolatlar', desc: 'Talablar', icon: Shield, to: '/partner/warranty', gradient: 'from-rose-500 to-red-600', shadow: 'shadow-rose-200' },
  ]

  return (
    <motion.div className="space-y-6 p-4 md:p-6" variants={stagger} initial="hidden" animate="show">
      {/* Welcome */}
      <motion.div variants={fadeUp} className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-200">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{d?.workshop_name || 'Ustaxona'}</h1>
          <p className="text-sm text-gray-500">Bugungi kunning umumiy ko'rinishi</p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Bugungi buyurtmalar', value: d?.today_bookings_count || 0, icon: CalendarCheck, gradient: 'from-blue-500 to-indigo-600', glow: 'shadow-blue-200' },
          { label: 'Bugungi daromad', value: formatPrice(d?.today_revenue || 0), icon: DollarSign, gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-200' },
          { label: 'O\'rtacha reyting', value: (d?.rating_avg || 0).toFixed(1), icon: Star, gradient: 'from-amber-500 to-orange-500', glow: 'shadow-amber-200' },
          { label: 'Bo\'sh slotlar', value: d?.empty_slots_today || 0, icon: Clock, gradient: 'from-purple-500 to-pink-600', glow: 'shadow-purple-200' },
        ].map((kpi, i) => (
          <motion.div key={i} variants={fadeUp}
            className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg', kpi.gradient, kpi.glow)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{kpi.label}</p>
                <p className="mt-1.5 text-3xl font-extrabold tracking-tight">{kpi.value}</p>
              </div>
              <div className="rounded-xl bg-white/15 p-2.5"><kpi.icon className="h-5 w-5" /></div>
            </div>
            <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
          </motion.div>
        ))}
      </motion.div>

      {/* Status counters */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
        {[
          { key: 'pending_count', label: 'Yangi', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
          { key: 'confirmed_count', label: 'Tasdiqlangan', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
          { key: 'in_progress_count', label: 'Jarayonda', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
          { key: 'completed_today', label: 'Bajarildi', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
        ].map(s => (
          <div key={s.key} className={cn('rounded-xl border-2 p-3 text-center cursor-pointer hover:shadow-md transition-all', s.bg, s.border)}
            onClick={() => navigate('/partner/bookings')}
          >
            <p className={cn('text-2xl font-extrabold', s.text)}>{(d as any)?.[s.key] || 0}</p>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider', s.text)}>{s.label}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Next Customers */}
        <motion.div variants={fadeUp} className="lg:col-span-3 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Keyingi mijozlar</h2>
              <p className="text-xs text-gray-400">{(d?.next_customers || []).length} ta navbatda</p>
            </div>
            <button onClick={() => navigate('/partner/bookings')} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              Barchasi <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {(d?.next_customers || []).length > 0 ? (
            <div className="divide-y divide-gray-50">
              {(d?.next_customers || []).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-sm font-bold">
                    {(c.customer_name || 'M').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.customer_name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{c.customer_phone || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{c.time}</p>
                    <p className="text-[10px] text-gray-400">{c.date}</p>
                  </div>
                  <div className="shrink-0">
                    <div className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                      c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[c.status] || 'bg-gray-300')} />
                      {STATUS_LABEL[c.status] || c.status}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 shrink-0">{formatPrice(c.total_price)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-gray-400">Navbatda mijozlar yo'q</div>
          )}
        </motion.div>

        {/* Weekly Revenue Chart */}
        <motion.div variants={fadeUp} className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Haftalik daromad</h2>
            <p className="text-xs text-gray-400">Oxirgi 7 kun</p>
          </div>
          {(d?.weekly_revenue || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.weekly_revenue} barSize={28}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 600 }} stroke="#9ca3af" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `${(v/1e6).toFixed(0)}M` : v >= 1000 ? `${(v/1e3).toFixed(0)}K` : v} />
                <Tooltip formatter={(v: number) => [formatPrice(v), 'Daromad']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="revenue" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">Ma'lumot yo'q</div>
          )}
          {/* Total stats under chart */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Jami buyurtmalar</p>
              <p className="text-lg font-extrabold text-gray-900">{d?.total_bookings || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Jami daromad</p>
              <p className="text-lg font-extrabold text-emerald-600">{formatPrice(d?.total_revenue || 0)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Reviews */}
      {recentReviews.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              <h2 className="text-base font-bold text-gray-900">So'nggi sharhlar</h2>
            </div>
            <button onClick={() => navigate('/partner/reviews')} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              Barchasi <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentReviews.slice(0, 3).map((r: any) => (
              <div key={r.id} className="flex items-start gap-3 px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold">
                  {(r.customer_name || 'M').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{r.customer_name}</span>
                    <div className="flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5">
                      <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-bold text-amber-700">{(r.rating_overall || 0).toFixed(1)}</span>
                    </div>
                    {r.reply && <Badge variant="success" size="sm">Javob berilgan</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{r.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Links Grid */}
      <motion.div variants={fadeUp}>
        <h2 className="mb-3 text-base font-bold text-gray-900">Tezkor havolalar</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickLinks.map(link => (
            <button key={link.to} onClick={() => navigate(link.to)}
              className={cn('group relative overflow-hidden rounded-2xl p-4 text-left text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl bg-gradient-to-br', link.gradient, link.shadow)}
            >
              <link.icon className="h-6 w-6 mb-2 text-white/80" />
              <p className="text-sm font-bold">{link.label}</p>
              <p className="text-[10px] text-white/60">{link.desc}</p>
              <div className="absolute -bottom-3 -right-3 h-12 w-12 rounded-full bg-white/10" />
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
