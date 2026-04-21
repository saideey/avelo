import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Star, Search, Trash2, Eye, ChevronLeft, ChevronRight,
  MessageSquare, Building2, User, Calendar,
} from 'lucide-react'
import api from '@/shared/api/axios'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Badge } from '@/shared/components/Badge'
import { Modal } from '@/shared/components/Modal'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { EmptyState } from '@/shared/components/EmptyState'
import { toast } from 'sonner'

const PAGE_SIZE = 15
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('uz', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return iso }
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={cn('h-3.5 w-3.5', i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
      ))}
    </div>
  )
}

export default function AdminReviewsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewReview, setViewReview] = useState<any>(null)
  const [deleteReview, setDeleteReview] = useState<any>(null)
  const [deleteReason, setDeleteReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', search, page],
    queryFn: () => {
      const p: Record<string, string | number> = { skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }
      if (search) p.search = search
      return api.get('/admin/reviews', { params: p }).then(r => r.data).catch(() => ({ items: [], total: 0 }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.delete(`/admin/reviews/${id}`, { data: { reason } }),
    onSuccess: () => {
      toast.success("Sharh o'chirildi")
      setDeleteReview(null)
      setDeleteReason('')
      qc.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
    onError: () => toast.error('Xatolik'),
  })

  const items = data?.items || []
  const total = data?.total || 0
  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <motion.div className="space-y-6 p-4 md:p-6" variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200">
          <Star className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Sharhlar</h1>
          <p className="text-sm text-gray-500">{total} ta sharh</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp}>
        <Input placeholder="Mijoz yoki ustaxona nomi..." iconLeft={<Search className="h-4 w-4" />}
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </motion.div>

      {/* Reviews */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>
      ) : !items.length ? (
        <EmptyState icon={<Star className="h-8 w-8" />} title="Sharhlar topilmadi" />
      ) : (
        <motion.div className="space-y-3" variants={stagger}>
          {items.map((r: any) => {
            const rating = r.rating_overall || 0
            const ratingColor = rating >= 4 ? 'text-emerald-700 bg-emerald-50' : rating >= 3 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
            return (
              <motion.div key={r.id} variants={fadeUp}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold">
                    {(r.customer_name || 'M').charAt(0)}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{r.customer_name || 'Mijoz'}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{r.workshop_name || 'Ustaxona'}
                          {r.workshop_city && <span className="text-gray-400">· {r.workshop_city}</span>}
                        </p>
                      </div>
                      <div className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', ratingColor)}>
                        <Star className="h-3 w-3 fill-current" />
                        {rating.toFixed(1)}
                      </div>
                    </div>
                    {/* Sub ratings */}
                    <div className="flex gap-3 mt-1.5 text-[10px] text-gray-400">
                      <span>Sifat: <b className="text-gray-600">{r.rating_quality}</b></span>
                      <span>Narx: <b className="text-gray-600">{r.rating_price}</b></span>
                      <span>Vaqt: <b className="text-gray-600">{r.rating_time}</b></span>
                      <span>Muloqot: <b className="text-gray-600">{r.rating_communication}</b></span>
                    </div>
                    {/* Comment */}
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{r.comment}</p>
                    {/* Reply */}
                    {r.reply && (
                      <div className="mt-2 rounded-lg bg-blue-50 p-2">
                        <p className="text-[10px] font-bold text-blue-700">Ustaxona javobi:</p>
                        <p className="text-xs text-blue-800">{r.reply}</p>
                      </div>
                    )}
                    {/* Footer */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />{fmtDate(r.created_at)}
                      </span>
                      <div className="flex gap-1.5">
                        <button onClick={() => setViewReview(r)}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Ko'rish
                        </button>
                        <button onClick={() => setDeleteReview(r)}
                          className="rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1">
                          <Trash2 className="h-3 w-3" /> O'chirish
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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

      {/* View Modal */}
      <Modal open={!!viewReview} onOpenChange={() => setViewReview(null)} title="Sharh tafsilotlari" size="md">
        {viewReview && (
          <div className="space-y-4">
            {/* Customer + Workshop */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                {(viewReview.customer_name || 'M').charAt(0)}
              </div>
              <div>
                <p className="text-base font-bold text-gray-900">{viewReview.customer_name}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />{viewReview.workshop_name} · {viewReview.workshop_city}
                </p>
              </div>
            </div>

            {/* Overall rating */}
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 p-3">
              <div className="text-2xl font-extrabold text-amber-700">{(viewReview.rating_overall || 0).toFixed(1)}</div>
              <div className="flex-1">
                <StarDisplay value={viewReview.rating_overall || 0} />
                <p className="text-xs text-amber-600 mt-0.5">Umumiy baho</p>
              </div>
            </div>

            {/* Sub ratings */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Sifat', value: viewReview.rating_quality, emoji: '🔧' },
                { label: 'Narx', value: viewReview.rating_price, emoji: '💰' },
                { label: 'Vaqt', value: viewReview.rating_time, emoji: '⏱️' },
                { label: 'Muloqot', value: viewReview.rating_communication, emoji: '💬' },
              ].map(r => (
                <div key={r.label} className="rounded-xl border border-gray-100 p-3 text-center">
                  <span className="text-lg">{r.emoji}</span>
                  <p className="text-xs text-gray-500 mt-1">{r.label}</p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold text-gray-900">{r.value || 0}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment */}
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Sharh matni</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewReview.comment}</p>
            </div>

            {/* Reply */}
            {viewReview.reply && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Ustaxona javobi</p>
                <p className="text-sm text-blue-800">{viewReview.reply}</p>
              </div>
            )}

            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" />{fmtDate(viewReview.created_at)}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setViewReview(null)}>Yopish</Button>
              <Button variant="danger" icon={<Trash2 className="h-4 w-4" />}
                onClick={() => { setViewReview(null); setDeleteReview(viewReview) }}>O'chirish</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteReview} onOpenChange={() => { setDeleteReview(null); setDeleteReason('') }} title="Sharhni o'chirish" size="sm">
        {deleteReview && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <b>{deleteReview.customer_name}</b> tomonidan <b>{deleteReview.workshop_name}</b> ga yozilgan sharhni o'chirishni tasdiqlaysizmi?
            </p>
            <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              rows={3} placeholder="O'chirish sababi..." />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setDeleteReview(null); setDeleteReason('') }}>Bekor qilish</Button>
              <Button variant="danger" loading={deleteMutation.isPending} disabled={!deleteReason.trim()}
                onClick={() => deleteMutation.mutate({ id: deleteReview.id, reason: deleteReason })}>O'chirish</Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  )
}
