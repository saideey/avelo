import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Calendar, CheckCircle, Play, X, Clock, Banknote,
  ChevronLeft, ChevronRight, Package, MapPin, FileText, Car,
  Phone, User, AlertCircle, Sparkles,
} from 'lucide-react'
import api from '@/shared/api/axios'
import { cn, formatPrice } from '@/shared/lib/utils'
import { Input } from '@/shared/components/Input'
import { Modal } from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { EmptyState } from '@/shared/components/EmptyState'
import { toast } from 'sonner'

interface Booking {
  id: string
  customer_name: string
  customer_phone: string
  scheduled_at: string
  status: string
  total_price: number
  notes: string | null
  is_mobile: boolean
  address: string | null
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; dot: string; glow: string }> = {
  pending:     { label: 'Yangi',        bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-400',   glow: 'shadow-amber-100' },
  confirmed:   { label: 'Tasdiqlangan', bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-400',    glow: 'shadow-blue-100' },
  in_progress: { label: 'Jarayonda',   bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  dot: 'bg-orange-400',  glow: 'shadow-orange-100' },
  completed:   { label: 'Bajarildi',   bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400', glow: 'shadow-emerald-100' },
  cancelled:   { label: 'Bekor',       bg: 'bg-gray-50',    border: 'border-gray-200',    text: 'text-gray-500',    dot: 'bg-gray-300',    glow: '' },
}

const FILTER_CHIPS = [
  { value: '', label: 'Barchasi' },
  { value: 'pending', label: 'Yangi' },
  { value: 'confirmed', label: 'Tasdiqlangan' },
  { value: 'in_progress', label: 'Jarayonda' },
  { value: 'completed', label: 'Bajarildi' },
  { value: 'cancelled', label: 'Bekor' },
]

const PER_PAGE = 12

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('uz', { day: '2-digit', month: 'short' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })
}

export default function PartnerBookingsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Booking | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['partner-bookings', search, filter, page],
    queryFn: () => {
      const p: Record<string, string | number> = { skip: (page - 1) * PER_PAGE, limit: PER_PAGE }
      if (search) p.search = search
      if (filter) p.status = filter
      return api.get('/partner/bookings', { params: p }).then(r => r.data).catch(() => ({ items: [], total: 0 }))
    },
  })

  const items: Booking[] = data?.items || []
  const total = data?.total || 0
  const pages = Math.ceil(total / PER_PAGE)

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.patch(`/bookings/${id}/${action}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['partner-bookings'] }); toast.success('Muvaffaqiyatli'); setSelected(null) },
    onError: () => toast.error('Xatolik'),
  })

  // Counts per status
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    items.forEach(b => { c[b.status] = (c[b.status] || 0) + 1 })
    return c
  }, [items])

  const sc = (s: string) => STATUS_CONFIG[s] || STATUS_CONFIG.cancelled

  return (
    <motion.div className="space-y-5 p-4 md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-200">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Buyurtmalar</h1>
            <p className="text-xs text-gray-500">{total} ta buyurtma</p>
          </div>
        </div>
      </div>

      {/* Status summary strip */}
      <div className="grid grid-cols-5 gap-2">
        {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => {
          const cfg = sc(s)
          return (
            <button key={s} onClick={() => { setFilter(filter === s ? '' : s); setPage(1) }}
              className={cn('rounded-xl p-3 text-center transition-all border-2',
                filter === s ? cfg.border + ' ' + cfg.bg + ' shadow-md ' + cfg.glow : 'border-transparent bg-white hover:bg-gray-50 shadow-sm'
              )}
            >
              <p className={cn('text-xl font-extrabold', filter === s ? cfg.text : 'text-gray-900')}>{counts[s] || 0}</p>
              <p className={cn('text-[10px] font-semibold uppercase tracking-wider mt-0.5', filter === s ? cfg.text : 'text-gray-400')}>{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <Input placeholder="Mijoz yoki mashina raqami..." iconLeft={<Search className="h-4 w-4" />} value={search}
        onChange={e => { setSearch(e.target.value); setPage(1) }} className="h-11 rounded-xl" />

      {/* Cards Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>
      ) : !items.length ? (
        <EmptyState icon={<Package className="h-8 w-8" />} title="Buyurtma topilmadi" description="Filtrni o'zgartiring" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {items.map((b, i) => {
              const cfg = sc(b.status)
              const actions = getActions(b)
              return (
                <motion.div key={b.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  onClick={() => setSelected(b)}
                  className={cn(
                    'relative cursor-pointer rounded-2xl border-2 p-4 transition-all hover:shadow-lg',
                    cfg.border, cfg.bg, cfg.glow,
                    'hover:-translate-y-0.5'
                  )}
                >
                  {/* Status indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider', cfg.text, cfg.bg, 'border', cfg.border)}>
                      <span className={cn('h-2 w-2 rounded-full animate-pulse', cfg.dot)} />
                      {cfg.label}
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">#{b.id.slice(0, 6)}</span>
                  </div>

                  {/* Customer */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm text-sm font-bold text-indigo-600 border border-indigo-100">
                      {(b.customer_name || 'M').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{b.customer_name}</p>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" />{b.customer_phone || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-700">{fmtDate(b.scheduled_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-700">{fmtTime(b.scheduled_at)}</span>
                    </div>
                  </div>

                  {/* Notes / License plate */}
                  {b.notes && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 mb-3">
                      <Car className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-600 truncate">{b.notes}</span>
                    </div>
                  )}

                  {b.is_mobile && (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 mb-3">
                      <MapPin className="h-3 w-3" /> Uyga chiqish
                    </div>
                  )}

                  {/* Price + Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-black/5">
                    <div className="flex items-center gap-1">
                      <Banknote className="h-4 w-4 text-emerald-500" />
                      <span className="text-base font-extrabold text-gray-900">{formatPrice(b.total_price)}</span>
                    </div>
                    {actions.length > 0 && (
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        {actions.map(a => (
                          <button key={a.action} title={a.label}
                            onClick={() => act.mutate({ id: b.id, action: a.action })}
                            className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-all', a.cls)}
                          >
                            <a.icon className="h-4 w-4" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm disabled:opacity-30 hover:bg-gray-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
              const pn = i + 1
              return (
                <button key={pn} onClick={() => setPage(pn)}
                  className={cn('h-9 w-9 rounded-lg text-sm font-semibold transition-all',
                    page === pn ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
                  )}
                >{pn}</button>
              )
            })}
            {pages > 5 && <span className="px-1 text-gray-400">...</span>}
          </div>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
            className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm disabled:opacity-30 hover:bg-gray-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onOpenChange={() => setSelected(null)} title="Buyurtma tafsiloti" size="lg">
        {selected && (() => {
          const cfg = sc(selected.status)
          const actions = getActions(selected)
          return (
            <div className="space-y-5">
              {/* Status banner */}
              <div className={cn('rounded-xl p-4 flex items-center justify-between', cfg.bg, 'border', cfg.border)}>
                <div className="flex items-center gap-2">
                  <span className={cn('h-3 w-3 rounded-full', cfg.dot, selected.status === 'pending' || selected.status === 'in_progress' ? 'animate-pulse' : '')} />
                  <span className={cn('text-sm font-bold', cfg.text)}>{cfg.label}</span>
                </div>
                <span className="text-xs font-mono text-gray-400">#{selected.id.slice(0, 8)}</span>
              </div>

              {/* Customer */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-lg font-bold shadow-lg">
                  {(selected.customer_name || 'M').charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{selected.customer_name}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selected.customer_phone || '—'}</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Calendar, label: 'Sana', value: fmtDate(selected.scheduled_at), color: 'text-blue-600' },
                  { icon: Clock, label: 'Vaqt', value: fmtTime(selected.scheduled_at), color: 'text-purple-600' },
                  { icon: Banknote, label: 'Narx', value: formatPrice(selected.total_price), color: 'text-emerald-600' },
                  { icon: Sparkles, label: 'Yaratilgan', value: selected.created_at ? fmtDate(selected.created_at) : '—', color: 'text-amber-600' },
                ].map(d => (
                  <div key={d.label} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <d.icon className={cn('h-3.5 w-3.5', d.color)} />
                      <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{d.label}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{d.value}</p>
                  </div>
                ))}
              </div>

              {selected.is_mobile && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-blue-700">Uyga chiqish xizmati</p>
                    <p className="text-sm text-blue-800 mt-0.5">{selected.address || 'Manzil ko\'rsatilmagan'}</p>
                  </div>
                </div>
              )}

              {selected.notes && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><FileText className="h-3 w-3" />Mijoz izohi</p>
                  <p className="text-sm text-gray-700">{selected.notes}</p>
                </div>
              )}

              {actions.length > 0 && (
                <div className="flex gap-2 pt-1">
                  {actions.map(a => (
                    <Button key={a.action} loading={act.isPending}
                      onClick={() => act.mutate({ id: selected.id, action: a.action })}
                      className={a.cls} icon={<a.icon className="h-4 w-4" />}
                    >{a.label}</Button>
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </Modal>
    </motion.div>
  )
}

function getActions(b: Booking) {
  const a: { label: string; action: string; icon: any; cls: string }[] = []
  if (b.status === 'pending') {
    a.push({ label: 'Tasdiqlash', action: 'confirm', icon: CheckCircle, cls: 'bg-blue-600 text-white hover:bg-blue-700' })
    a.push({ label: 'Rad etish', action: 'cancel', icon: X, cls: 'bg-red-100 text-red-600 hover:bg-red-200' })
  }
  if (b.status === 'confirmed') a.push({ label: 'Boshlash', action: 'start', icon: Play, cls: 'bg-orange-500 text-white hover:bg-orange-600' })
  if (b.status === 'in_progress') a.push({ label: 'Tugatish', action: 'complete', icon: CheckCircle, cls: 'bg-emerald-600 text-white hover:bg-emerald-700' })
  return a
}
