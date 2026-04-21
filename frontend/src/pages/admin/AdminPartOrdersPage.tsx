import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Truck, Package, CheckCircle, Clock, XCircle, MapPin,
  Building2, Phone, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ArrowRight, Box,
} from 'lucide-react'
import api from '@/shared/api/axios'
import { cn, formatPrice } from '@/shared/lib/utils'
import { Badge } from '@/shared/components/Badge'
import { Button } from '@/shared/components/Button'
import { Modal } from '@/shared/components/Modal'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { EmptyState } from '@/shared/components/EmptyState'
import { toast } from 'sonner'

const PAGE_SIZE = 15
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

const STATUS: Record<string, { label: string; variant: 'warning' | 'primary' | 'info' | 'success' | 'danger' | 'default'; icon: any; color: string; next?: { action: string; label: string } }> = {
  pending:            { label: 'Yangi', variant: 'warning', icon: Clock, color: 'bg-amber-50 border-amber-200 text-amber-700', next: { action: 'review', label: "Ko'rib chiqish" } },
  admin_reviewed:     { label: 'Ustaga yuborildi', variant: 'primary', icon: CheckCircle, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  partner_confirmed:  { label: 'Usta tasdiqladi', variant: 'primary', icon: CheckCircle, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', next: { action: 'shipped', label: "Jo'natish" } },
  shipped:            { label: "Yo'lda", variant: 'info' as any, icon: Truck, color: 'bg-purple-50 border-purple-200 text-purple-700' },
  partner_received:   { label: 'Usta qabul qildi', variant: 'success', icon: CheckCircle, color: 'bg-teal-50 border-teal-200 text-teal-700', next: { action: 'delivered', label: 'Yakunlash' } },
  delivered:          { label: 'Yakunlangan', variant: 'success', icon: CheckCircle, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  cancelled:          { label: 'Bekor', variant: 'danger', icon: XCircle, color: 'bg-red-50 border-red-200 text-red-500' },
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('uz', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminPartOrdersPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [reviewOrder, setReviewOrder] = useState<any>(null)
  const [reviewItems, setReviewItems] = useState<any[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-part-orders', filter, page],
    queryFn: () => {
      const p: Record<string, string | number> = { skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }
      if (filter) p.status = filter
      return api.get('/admin/part-orders', { params: p }).then(r => r.data).catch(() => ({ items: [], total: 0 }))
    },
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: any[] }) =>
      api.patch(`/admin/part-orders/${id}/review`, { items }),
    onSuccess: () => { toast.success("Ko'rib chiqildi va ustaga yuborildi"); setReviewOrder(null); qc.invalidateQueries({ queryKey: ['admin-part-orders'] }) },
    onError: () => toast.error('Xatolik'),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/part-orders/${id}/status`, { status }),
    onSuccess: () => { toast.success('Status yangilandi'); qc.invalidateQueries({ queryKey: ['admin-part-orders'] }) },
    onError: () => toast.error('Xatolik'),
  })

  const items = data?.items || []
  const total = data?.total || 0
  const pages = Math.ceil(total / PAGE_SIZE)

  // Counts
  const counts: Record<string, number> = {}
  items.forEach((o: any) => { counts[o.status] = (counts[o.status] || 0) + 1 })

  return (
    <motion.div className="space-y-6 p-4 md:p-6" variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-200">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Qism Buyurtmalari</h1>
          <p className="text-sm text-gray-500">{total} ta buyurtma</p>
        </div>
      </motion.div>

      {/* Status counters */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {['pending', 'admin_reviewed', 'partner_confirmed', 'shipped', 'partner_received', 'delivered', 'cancelled'].map(s => {
          const cfg = STATUS[s]
          return (
            <button key={s} onClick={() => { setFilter(filter === s ? '' : s); setPage(1) }}
              className={cn('rounded-xl p-3 text-center transition-all border-2',
                filter === s ? cfg.color + ' shadow-md' : 'border-transparent bg-white hover:bg-gray-50 shadow-sm'
              )}
            >
              <cfg.icon className="h-4 w-4 mx-auto mb-1" />
              <p className="text-lg font-extrabold">{counts[s] || 0}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider">{cfg.label}</p>
            </button>
          )
        })}
      </motion.div>

      {/* Orders */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>
      ) : !items.length ? (
        <EmptyState icon={<Truck className="h-8 w-8" />} title="Buyurtmalar yo'q" />
      ) : (
        <motion.div className="space-y-3" variants={stagger}>
          {items.map((o: any) => {
            const cfg = STATUS[o.status] || STATUS.pending
            const isOpen = expanded === o.id
            return (
              <motion.div key={o.id} variants={fadeUp}
                className={cn('rounded-2xl border-2 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md', cfg.color.split(' ')[1] || 'border-gray-100')}
              >
                {/* Header */}
                <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : o.id)}>
                  <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', cfg.color.split(' ')[0])}>
                    <cfg.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{o.workshop_name || 'Ustaxona'}</p>
                      <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{o.workshop_city || o.delivery_address}</span>
                      <span>{o.items_count} ta qism</span>
                      <span>{fmtDate(o.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-extrabold text-gray-900">{formatPrice(o.total_amount)}</p>
                    {o.delivery_fee > 0 && <p className="text-[10px] text-gray-400">+{formatPrice(o.delivery_fee)} yetkazish</p>}
                  </div>
                  <div className="text-gray-300">
                    {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t border-gray-100">
                    <div className="p-4 space-y-4">
                      {/* Items */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Mahsulotlar</p>
                        <div className="space-y-2">
                          {(o.items || []).map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                                <Box className="h-4 w-4 text-orange-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{item.part_name}</p>
                                <p className="text-[10px] font-mono text-gray-400">{item.sku}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-gray-900">{item.quantity} x {formatPrice(item.unit_price)}</p>
                                <p className="text-xs text-gray-500">{formatPrice(item.quantity * item.unit_price)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Booking / Mijoz info */}
                      {o.booking && (
                        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                          <p className="text-[10px] text-blue-700 uppercase font-bold mb-1">Mijoz buyurtmasi uchun</p>
                          <p className="text-sm font-bold text-blue-900">{o.booking.customer_name || 'Mijoz'}</p>
                          {o.booking.notes && <p className="text-xs text-blue-700 mt-0.5">{o.booking.notes}</p>}
                          {o.booking.scheduled_at && <p className="text-[10px] text-blue-600 mt-0.5">Sana: {fmtDate(o.booking.scheduled_at)}</p>}
                        </div>
                      )}

                      {/* Info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-gray-100 p-3">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold flex items-center gap-1"><Building2 className="h-3 w-3" />Ustaxona</p>
                          <p className="text-sm font-bold text-gray-900 mt-1">{o.workshop_name}</p>
                          <p className="text-xs text-gray-500">{o.workshop_city}</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 p-3">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold flex items-center gap-1"><MapPin className="h-3 w-3" />Yetkazish manzili</p>
                          <p className="text-sm text-gray-700 mt-1">{o.delivery_address}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        {cfg.next && cfg.next.action === 'review' ? (
                          <Button size="sm"
                            onClick={() => { setReviewOrder(o); setReviewItems((o.items || []).map((it: any, idx: number) => ({ item_id: it.item_id || idx, part_name: it.part_name, is_available: true, admin_note: '' }))) }}
                            icon={<ArrowRight className="h-4 w-4" />}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {cfg.next.label}
                          </Button>
                        ) : cfg.next ? (
                          <Button size="sm" loading={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ id: o.id, status: cfg.next!.action })}
                            icon={<ArrowRight className="h-4 w-4" />}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {cfg.next.label}
                          </Button>
                        ) : null}
                        {o.status === 'pending' && (
                          <Button size="sm" variant="danger"
                            onClick={() => updateStatus.mutate({ id: o.id, status: 'cancelled' })}
                            icon={<XCircle className="h-4 w-4" />}
                          >
                            Bekor qilish
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-xl border border-gray-200 bg-white p-2.5 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-semibold">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="rounded-xl border border-gray-200 bg-white p-2.5 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
      {/* Review Modal */}
      <Modal open={!!reviewOrder} onOpenChange={() => setReviewOrder(null)} title="Buyurtmani ko'rib chiqish" size="lg">
        {reviewOrder && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Har bir qismning mavjudligini belgilang va ustaga yuboring:</p>
            <div className="space-y-2">
              {reviewItems.map((item: any, i: number) => (
                <div key={i} className={cn('flex items-center gap-3 rounded-xl border p-3 transition-all',
                  item.is_available ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                )}>
                  <button onClick={() => setReviewItems(prev => prev.map((it, idx) => idx === i ? { ...it, is_available: !it.is_available } : it))}
                    className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white font-bold text-xs',
                      item.is_available ? 'bg-emerald-500' : 'bg-red-500'
                    )}
                  >
                    {item.is_available ? '✓' : '✕'}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold', item.is_available ? 'text-gray-900' : 'text-red-700 line-through')}>{item.part_name}</p>
                  </div>
                  <input placeholder="Izoh..." value={item.admin_note}
                    onChange={e => setReviewItems(prev => prev.map((it, idx) => idx === i ? { ...it, admin_note: e.target.value } : it))}
                    className="w-40 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button fullWidth loading={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ id: reviewOrder.id, items: reviewItems })}
                icon={<ArrowRight className="h-4 w-4" />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Ustaga yuborish
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  )
}
