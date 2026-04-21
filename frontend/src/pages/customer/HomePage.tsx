import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Droplets, Activity, Disc, CircleDot, Cog, Zap, Car, Snowflake,
  ChevronRight, Wallet, Star, MapPin, Clock, Calendar, Shield,
  Heart, Search, Bell, Sparkles, BadgeCheck, Banknote, ArrowRight,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/app/hooks'
import { Badge } from '@/shared/components/Badge'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { cn, formatPrice } from '@/shared/lib/utils'
import api from '@/shared/api/axios'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const categories = [
  { key: 'oilChange', icon: Droplets, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-200', query: 'moy' },
  { key: 'diagnostics', icon: Activity, gradient: 'from-blue-400 to-indigo-500', shadow: 'shadow-blue-200', query: 'diagnostika' },
  { key: 'brakes', icon: Disc, gradient: 'from-red-400 to-rose-500', shadow: 'shadow-red-200', query: 'tormoz' },
  { key: 'tires', icon: CircleDot, gradient: 'from-gray-500 to-gray-600', shadow: 'shadow-gray-200', query: 'shina' },
  { key: 'engine', icon: Cog, gradient: 'from-orange-400 to-red-500', shadow: 'shadow-orange-200', query: 'dvigatel' },
  { key: 'electrical', icon: Zap, gradient: 'from-yellow-400 to-amber-500', shadow: 'shadow-yellow-200', query: 'elektr' },
  { key: 'bodywork', icon: Car, gradient: 'from-indigo-400 to-purple-500', shadow: 'shadow-indigo-200', query: 'kuzov' },
  { key: 'ac', icon: Snowflake, gradient: 'from-cyan-400 to-blue-500', shadow: 'shadow-cyan-200', query: 'konditsioner' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Kutilmoqda', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  confirmed: { label: 'Tasdiqlangan', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  in_progress: { label: 'Jarayonda', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  completed: { label: 'Tugallangan', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
}

export default function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAppSelector(s => s.auth.user)

  const { data: wsData, isLoading: wsLoading } = useQuery({
    queryKey: ['home-workshops'],
    queryFn: () => api.get('/workshops/', { params: { limit: 8 } }).then(r => r.data).catch(() => ({ items: [] })),
  })

  const { data: cashback } = useQuery({
    queryKey: ['home-cashback'],
    queryFn: () => api.get('/users/me/cashback').then(r => r.data).catch(() => null),
  })

  const { data: activeBookings } = useQuery({
    queryKey: ['home-active'],
    queryFn: () => api.get('/users/me/bookings', { params: { status: 'pending,confirmed,in_progress', limit: 3 } })
      .then(r => r.data?.items || []).catch(() => []),
  })

  const { data: recentBookings } = useQuery({
    queryKey: ['home-recent'],
    queryFn: () => api.get('/users/me/bookings', { params: { status: 'completed', limit: 3 } })
      .then(r => r.data?.items || []).catch(() => []),
  })

  const { data: warranties } = useQuery({
    queryKey: ['home-warranties'],
    queryFn: () => api.get('/users/me/warranties').then(r => Array.isArray(r.data) ? r.data : []).catch(() => []),
  })

  const { data: notifications } = useQuery({
    queryKey: ['home-notifs'],
    queryFn: () => api.get('/notifications/', { params: { limit: 3 } }).then(r => r.data?.items || r.data || []).catch(() => []),
  })

  const workshops = wsData?.items || wsData?.results || (Array.isArray(wsData) ? wsData : [])
  const unreadNotifs = Array.isArray(notifications) ? notifications.filter((n: any) => !n.is_read).length : 0
  const tierLabel = (cashback?.tier || 'bronze').charAt(0).toUpperCase() + (cashback?.tier || 'bronze').slice(1)

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-lg space-y-5 px-4 py-5">

      {/* Welcome + Search */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Assalomu alaykum 👋</p>
            <h1 className="text-xl font-extrabold text-gray-900">{user?.full_name?.split(' ')[0] || 'Foydalanuvchi'}</h1>
          </div>
          <button onClick={() => navigate('/profile')}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-200">
            {(user?.full_name || 'U').charAt(0)}
            {unreadNotifs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">{unreadNotifs}</span>
            )}
          </button>
        </div>
        {/* Search bar */}
        <button onClick={() => navigate('/search')}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm hover:shadow-md transition-all"
        >
          <Search className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-400">Ustaxona yoki xizmatni qidiring...</span>
          <MapPin className="h-4 w-4 text-blue-500 ml-auto" />
        </button>
      </motion.div>

      {/* Cashback Card */}
      {cashback && (
        <motion.div variants={fadeUp} whileTap={{ scale: 0.98 }}
          className="cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-5 text-white shadow-xl shadow-blue-500/25"
          onClick={() => navigate('/cashback')}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-200" />
                <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Cashback</span>
              </div>
              <p className="mt-2 text-3xl font-extrabold tracking-tight">{formatPrice(cashback.balance || 0)}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />{tierLabel}
                </span>
                <span className="text-[11px] text-blue-200">Jami: {formatPrice(cashback.total_earned || 0)}</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <Star className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/5" />
        </motion.div>
      )}

      {/* Active Bookings */}
      {activeBookings?.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" /> Faol buyurtmalar
            </h2>
            <button onClick={() => navigate('/bookings')} className="text-xs text-blue-600 font-semibold flex items-center gap-0.5">
              Barchasi <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {activeBookings.map((b: any) => {
              const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending
              return (
                <motion.div key={b.id} whileTap={{ scale: 0.98 }}
                  className={cn('cursor-pointer rounded-2xl border-2 p-4 transition-all hover:shadow-md', sc.bg)}
                  onClick={() => navigate(`/bookings/${b.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                        <Car className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{b.notes || 'Buyurtma'}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(b.scheduled_at).toLocaleDateString('uz', { day: 'numeric', month: 'short' })}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(b.scheduled_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn('text-[11px] font-bold', sc.color)}>{sc.label}</span>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{formatPrice(b.total_price || 0)}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Quick Service Categories */}
      <motion.div variants={fadeUp}>
        <h2 className="mb-3 text-base font-bold text-gray-900">{t('home.quickActions')}</h2>
        <div className="grid grid-cols-4 gap-2.5">
          {categories.map((cat, i) => {
            const Icon = cat.icon
            return (
              <motion.button key={cat.key} variants={fadeUp} whileTap={{ scale: 0.92 }}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all"
                onClick={() => navigate(`/search?category=${cat.query}`)}
              >
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', cat.gradient, cat.shadow)}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold text-gray-600 leading-tight text-center">{t(`home.${cat.key}`)}</span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Warranties Alert */}
      {warranties && warranties.length > 0 && (
        <motion.div variants={fadeUp} whileTap={{ scale: 0.98 }}
          className="cursor-pointer rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 p-4"
          onClick={() => navigate('/warranties')}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Shield className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-800">{warranties.length} ta faol kafolat</p>
              <p className="text-xs text-emerald-600">Kafolatlaringizni kuzating</p>
            </div>
            <ChevronRight className="h-5 w-5 text-emerald-400" />
          </div>
        </motion.div>
      )}

      {/* Nearby Workshops */}
      <motion.div variants={fadeUp}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">{t('home.nearbyWorkshops')}</h2>
          <button onClick={() => navigate('/search')} className="flex items-center gap-0.5 text-xs font-semibold text-blue-600">
            {t('common.all')}<ChevronRight className="h-3 w-3" />
          </button>
        </div>
        {wsLoading ? (
          <LoadingSpinner className="py-8" />
        ) : workshops.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {workshops.map((ws: any) => (
              <motion.div key={ws.id} whileTap={{ scale: 0.97 }}
                className="w-56 shrink-0 cursor-pointer rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
                onClick={() => navigate(`/workshop/${ws.slug || ws.id}`)}
              >
                {/* Photo */}
                <div className="h-28 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center relative">
                  {(ws.photos?.[0]?.url) ? (
                    <img src={ws.photos[0].url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <MapPin className="h-8 w-8 text-blue-300" />
                  )}
                  {ws.is_verified && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 shadow-sm">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="text-[11px] font-bold text-gray-700">{(ws.rating_avg || 0).toFixed(1)}</span>
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{ws.name}</h3>
                  <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />{ws.city || ws.address}
                  </p>
                  {ws.services && ws.services.length > 0 && (
                    <div className="flex gap-1 mt-2 overflow-hidden">
                      {ws.services.slice(0, 2).map((s: any) => (
                        <span key={s.id || s.name} className="text-[9px] bg-blue-50 text-blue-600 font-medium px-1.5 py-0.5 rounded-full truncate">{s.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
            <MapPin className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-400">Ustaxonalar topilmadi</p>
          </div>
        )}
      </motion.div>

      {/* Recent Bookings */}
      {recentBookings?.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">{t('home.recentHistory')}</h2>
            <button onClick={() => navigate('/bookings')} className="flex items-center gap-0.5 text-xs font-semibold text-blue-600">
              {t('common.all')}<ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recentBookings.map((b: any) => (
              <motion.div key={b.id} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 cursor-pointer rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm hover:shadow-md transition-all"
                onClick={() => navigate(`/bookings/${b.id}`)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Car className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{b.notes || 'Buyurtma'}</p>
                  <p className="text-xs text-gray-400">{new Date(b.scheduled_at || b.created_at).toLocaleDateString('uz', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(b.total_price || 0)}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">Tugallangan</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Links Footer */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2 pb-4">
        {[
          { icon: Heart, label: 'Sevimlilar', to: '/favorites', gradient: 'from-red-400 to-rose-500' },
          { icon: Shield, label: 'Kafolatlar', to: '/warranties', gradient: 'from-emerald-400 to-teal-500' },
          { icon: Wallet, label: 'Cashback', to: '/cashback', gradient: 'from-blue-400 to-indigo-500' },
        ].map(link => (
          <button key={link.to} onClick={() => navigate(link.to)}
            className={cn('flex flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-br p-3.5 text-white shadow-lg transition-all hover:-translate-y-0.5', link.gradient)}
          >
            <link.icon className="h-5 w-5" />
            <span className="text-[10px] font-bold">{link.label}</span>
          </button>
        ))}
      </motion.div>
    </motion.div>
  )
}
