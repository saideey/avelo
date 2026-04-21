import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  DollarSign, Clock, CheckCircle, XCircle, CreditCard, Calendar,
  ChevronLeft, ChevronRight, User, Building2, Banknote, Phone,
  MapPin, FileText, ArrowUpRight, ArrowDownRight, Wallet,
} from 'lucide-react'
import api from '@/shared/api/axios'
import { cn, formatPrice, formatPhone } from '@/shared/lib/utils'
import { Badge } from '@/shared/components/Badge'
import { Modal } from '@/shared/components/Modal'
import { Input } from '@/shared/components/Input'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { EmptyState } from '@/shared/components/EmptyState'

const PAGE_SIZE = 20
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

const STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default'; icon: any; color: string }> = {
  SUCCESS: { label: 'Muvaffaqiyatli', variant: 'success', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
  PENDING: { label: 'Kutilmoqda', variant: 'warning', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  FAILED: { label: 'Xatolik', variant: 'danger', icon: XCircle, color: 'text-red-600 bg-red-50' },
  REFUNDED: { label: 'Qaytarilgan', variant: 'default', icon: ArrowDownRight, color: 'text-gray-600 bg-gray-50' },
  PROCESSING: { label: 'Jarayonda', variant: 'warning', icon: Clock, color: 'text-blue-600 bg-blue-50' },
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Naqd pul', CARD: 'Karta', CLICK: 'Click', PAYME: 'Payme', UZUM: 'UZUM',
  cash: 'Naqd pul', card: 'Karta', click: 'Click', payme: 'Payme',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('uz', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return iso }
}
function fmtTime(iso: string | null) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export default function AdminPaymentsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', statusFilter, methodFilter, page],
    queryFn: () => {
      const p: Record<string, string | number> = { skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }
      if (statusFilter) p.status = statusFilter
      if (methodFilter) p.method = methodFilter
      return api.get('/admin/payments', { params: p }).then(r => r.data).catch(() => ({ items: [], total: 0 }))
    },
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-payment-detail', selectedId],
    queryFn: () => api.get(`/admin/payments/${selectedId}`).then(r => r.data).catch(() => null),
    enabled: !!selectedId,
  })

  const items = data?.items || []
  const total = data?.total || 0
  const pages = Math.ceil(total / PAGE_SIZE)

  // Quick stats from data
  const totalAmount = items.reduce((s: number, p: any) => s + (p.amount || 0), 0)
  const successCount = items.filter((p: any) => (p.status || '').toUpperCase() === 'SUCCESS').length
  const pendingCount = items.filter((p: any) => (p.status || '').toUpperCase() === 'PENDING').length

  const sc = (status: string) => STATUS[(status || '').toUpperCase()] || STATUS.PENDING

  return (
    <motion.div className="space-y-6 p-4 md:p-6" variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200">
          <Wallet className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">To'lovlar</h1>
          <p className="text-sm text-gray-500">{total} ta tranzaksiya</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
          <p className="text-xl font-extrabold text-emerald-700">{formatPrice(totalAmount)}</p>
          <p className="text-[10px] font-semibold text-emerald-600 uppercase">Sahifadagi jami</p>
        </div>
        <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-center">
          <p className="text-xl font-extrabold text-green-700">{successCount}</p>
          <p className="text-[10px] font-semibold text-green-600 uppercase">Muvaffaqiyatli</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
          <p className="text-xl font-extrabold text-amber-700">{pendingCount}</p>
          <p className="text-[10px] font-semibold text-amber-600 uppercase">Kutilmoqda</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex gap-2 flex-wrap">
        {[
          { value: '', label: 'Barchasi' },
          { value: 'SUCCESS', label: 'Muvaffaqiyatli' },
          { value: 'PENDING', label: 'Kutilmoqda' },
          { value: 'FAILED', label: 'Xatolik' },
          { value: 'REFUNDED', label: 'Qaytarilgan' },
        ].map(f => (
          <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1) }}
            className={cn('rounded-full px-4 py-2 text-xs font-semibold transition-all',
              statusFilter === f.value ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}
          >{f.label}</button>
        ))}
        <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1) }}
          className="h-9 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">Barcha usullar</option>
          <option value="CASH">Naqd</option>
          <option value="CARD">Karta</option>
          <option value="CLICK">Click</option>
          <option value="PAYME">Payme</option>
        </select>
      </motion.div>

      {/* Payments List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>
      ) : !items.length ? (
        <EmptyState icon={<CreditCard className="h-8 w-8" />} title="To'lovlar topilmadi" />
      ) : (
        <motion.div className="space-y-2" variants={stagger}>
          {items.map((p: any, i: number) => {
            const cfg = sc(p.status)
            return (
              <motion.div key={p.id} variants={fadeUp}
                onClick={() => setSelectedId(p.id)}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
              >
                {/* Icon */}
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', cfg.color)}>
                  <cfg.icon className="h-5 w-5" />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">{p.customer_name || 'Mijoz'}</p>
                    <span className="text-[10px] text-gray-400">→</span>
                    <p className="text-sm text-gray-600 truncate">{p.workshop_name || 'Ustaxona'}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span>{METHOD_LABEL[p.method] || p.method}</span>
                    <span>{fmtDate(p.paid_at || p.created_at)}</span>
                  </div>
                </div>
                {/* Amount + Status */}
                <div className="text-right shrink-0">
                  <p className="text-base font-extrabold text-gray-900">{formatPrice(p.amount)}</p>
                  <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-semibold text-gray-700">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
            className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selectedId} onOpenChange={() => setSelectedId(null)} title="To'lov tafsiloti" size="lg">
        {detailLoading ? (
          <div className="flex h-40 items-center justify-center"><LoadingSpinner size="lg" /></div>
        ) : detail ? (
          <div className="space-y-5">
            {/* Status Banner */}
            {(() => {
              const cfg = sc(detail.status)
              return (
                <div className={cn('rounded-xl p-4 flex items-center justify-between', cfg.color.split(' ')[1], 'border', cfg.color.includes('emerald') ? 'border-emerald-200' : cfg.color.includes('amber') ? 'border-amber-200' : cfg.color.includes('red') ? 'border-red-200' : 'border-gray-200')}>
                  <div className="flex items-center gap-2">
                    <cfg.icon className="h-5 w-5" />
                    <span className={cn('text-sm font-bold', cfg.color.split(' ')[0])}>{cfg.label}</span>
                  </div>
                  <span className="text-xs font-mono text-gray-400">#{String(detail.id).slice(0, 8)}</span>
                </div>
              )
            })()}

            {/* Amount */}
            <div className="text-center py-2">
              <p className="text-3xl font-extrabold text-gray-900">{formatPrice(detail.amount)}</p>
              <p className="text-sm text-gray-500 mt-1">{METHOD_LABEL[detail.method] || detail.method} orqali</p>
            </div>

            {/* Customer → Workshop */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-blue-500" />
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">To'lovchi</span>
                </div>
                <p className="text-sm font-bold text-gray-900">{detail.customer?.name || '—'}</p>
                {detail.customer?.phone && (
                  <a href={`tel:${detail.customer.phone}`} className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" />{formatPhone(detail.customer.phone)}
                  </a>
                )}
              </div>
              <div className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-purple-500" />
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">Qabul qiluvchi</span>
                </div>
                <p className="text-sm font-bold text-gray-900">{detail.workshop?.name || '—'}</p>
                {detail.workshop?.city && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />{detail.workshop.city}
                  </p>
                )}
                {detail.workshop?.phone && (
                  <a href={`tel:${detail.workshop.phone}`} className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" />{detail.workshop.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">To'lov sanasi</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{fmtDate(detail.paid_at)}</p>
                <p className="text-xs text-gray-400">{fmtTime(detail.paid_at)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Yaratilgan</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{fmtDate(detail.created_at)}</p>
              </div>
              {detail.gateway_txn_id && (
                <div className="rounded-xl border border-gray-100 p-3 col-span-2">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Gateway tranzaksiya ID</p>
                  <p className="text-sm font-mono text-gray-700 mt-1">{detail.gateway_txn_id}</p>
                </div>
              )}
            </div>

            {/* Booking Info */}
            {detail.booking && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">Buyurtma ma'lumotlari</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Buyurtma narxi</p>
                    <p className="font-bold text-gray-900">{formatPrice(detail.booking.total_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <Badge variant={detail.booking.status === 'completed' ? 'success' : 'default'} size="sm">
                      {detail.booking.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Rejalashtirilgan</p>
                    <p className="text-gray-700">{fmtDate(detail.booking.scheduled_at)}</p>
                  </div>
                  {detail.booking.notes && (
                    <div>
                      <p className="text-xs text-gray-400">Izoh</p>
                      <p className="text-gray-700">{detail.booking.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-400">Ma'lumot topilmadi</div>
        )}
      </Modal>
    </motion.div>
  )
}
