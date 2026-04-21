import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, MessageSquare, ChevronDown, ChevronUp, Send, CheckCircle,
  ThumbsUp, ThumbsDown, TrendingUp, Users, BarChart3,
} from 'lucide-react'
import api from '@/shared/api/axios'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { EmptyState } from '@/shared/components/EmptyState'
import { toast } from 'sonner'

interface Review {
  id: string
  customer_name: string
  rating_quality: number
  rating_price: number
  rating_time: number
  rating_communication: number
  rating_overall: number
  comment: string
  reply: string | null
  created_at: string
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const ratingCriteria = [
  { key: 'rating_quality', label: 'Sifat', emoji: '🔧' },
  { key: 'rating_price', label: 'Narx', emoji: '💰' },
  { key: 'rating_time', label: 'Vaqt', emoji: '⏱️' },
  { key: 'rating_communication', label: 'Muloqot', emoji: '💬' },
]

function StarDisplay({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={cn('h-3.5 w-3.5', i < value ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
      ))}
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'Hozirgina'
  if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`
  if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} kun oldin`
  return date.toLocaleDateString('uz', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PartnerReviewsPage() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [filter, setFilter] = useState<'all' | 'replied' | 'pending'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['partner-reviews'],
    queryFn: () => api.get('/partner/reviews', { params: { limit: 50 } }).then(r => r.data).catch(() => ({ items: [] })),
  })

  const reviews: Review[] = data?.items || data?.results || (Array.isArray(data) ? data : [])

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) =>
      api.post(`/partner/reviews/${id}/reply`, { reply }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-reviews'] })
      toast.success('Javob muvaffaqiyatli yuborildi')
      setReplyingId(null)
      setReplyText('')
    },
    onError: () => toast.error('Javob yuborishda xatolik'),
  })

  // Stats
  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, total: 0, replied: 0, pending: 0, positive: 0, negative: 0 }
    const avg = reviews.reduce((s, r) => s + r.rating_overall, 0) / reviews.length
    const replied = reviews.filter(r => r.reply).length
    const positive = reviews.filter(r => r.rating_overall >= 4).length
    const negative = reviews.filter(r => r.rating_overall < 3).length
    return { avg: Math.round(avg * 10) / 10, total: reviews.length, replied, pending: reviews.length - replied, positive, negative }
  }, [reviews])

  const filtered = useMemo(() => {
    if (filter === 'replied') return reviews.filter(r => r.reply)
    if (filter === 'pending') return reviews.filter(r => !r.reply)
    return reviews
  }, [reviews, filter])

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" label="Yuklanmoqda..." /></div>
  }

  return (
    <motion.div className="space-y-6 p-4 md:p-6" variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
          <Star className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mijoz Sharhlari</h1>
          <p className="text-sm text-gray-500">Baholar va fikr-mulohazalar</p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-extrabold text-amber-500">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            {stats.avg}
          </div>
          <p className="text-xs text-gray-500 mt-1">O'rtacha reyting</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">Jami sharhlar</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <p className="text-2xl font-extrabold text-emerald-600">{stats.replied}</p>
          <p className="text-xs text-gray-500 mt-1">Javob berilgan</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <p className="text-2xl font-extrabold text-orange-500">{stats.pending}</p>
          <p className="text-xs text-gray-500 mt-1">Javob kutmoqda</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <ThumbsUp className="h-4 w-4 text-emerald-500" />
            <p className="text-2xl font-extrabold text-emerald-600">{stats.positive}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">Ijobiy (4+)</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <ThumbsDown className="h-4 w-4 text-red-500" />
            <p className="text-2xl font-extrabold text-red-500">{stats.negative}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">Salbiy (3-)</p>
        </div>
      </motion.div>

      {/* Filter */}
      <motion.div variants={fadeUp} className="flex gap-2">
        {[
          { key: 'all' as const, label: 'Hammasi', count: stats.total },
          { key: 'pending' as const, label: 'Javob kutmoqda', count: stats.pending },
          { key: 'replied' as const, label: 'Javob berilgan', count: stats.replied },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn('flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all',
              filter === f.key ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}
          >
            {f.label}
            <span className={cn('ml-0.5 text-xs rounded-full px-1.5 py-0.5', filter === f.key ? 'bg-white/20' : 'bg-gray-100')}>
              {f.count}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Reviews List */}
      {!filtered.length ? (
        <EmptyState icon={<Star className="h-8 w-8" />} title="Sharhlar topilmadi" description="Tanlangan filtr bo'yicha sharhlar yo'q" />
      ) : (
        <motion.div className="space-y-4" variants={stagger}>
          {filtered.map((review) => {
            const isExpanded = expandedId === review.id
            const isReplying = replyingId === review.id
            const ratingColor = review.rating_overall >= 4 ? 'text-emerald-600 bg-emerald-50' : review.rating_overall >= 3 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'

            return (
              <motion.div key={review.id} variants={fadeUp}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start gap-4 p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : review.id)}>
                  {/* Avatar */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-sm">
                    {(review.customer_name || 'M').charAt(0)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{review.customer_name}</span>
                      {review.reply ? (
                        <Badge variant="success" size="sm"><CheckCircle className="mr-1 h-3 w-3" />Javob berilgan</Badge>
                      ) : (
                        <Badge variant="warning" size="sm">Javob kutmoqda</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <div className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold', ratingColor)}>
                        <Star className="h-3 w-3 fill-current" />
                        {review.rating_overall.toFixed(1)}
                      </div>
                      <span className="text-xs text-gray-400">{timeAgo(review.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{review.comment}</p>
                  </div>

                  {/* Expand icon */}
                  <div className={cn('shrink-0 rounded-full p-1 transition-colors', isExpanded ? 'bg-blue-50 text-blue-600' : 'text-gray-300')}>
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>

                {/* Expanded */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100 p-5 space-y-5">
                        {/* Full comment */}
                        <div className="rounded-xl bg-gray-50 p-4">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">To'liq sharh</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                        </div>

                        {/* 4 ratings */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Batafsil baholar</p>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {ratingCriteria.map(({ key, label, emoji }) => {
                              const val = (review as any)[key] || 0
                              return (
                                <div key={key} className="rounded-xl border border-gray-100 bg-white p-3">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <span className="text-base">{emoji}</span>
                                    <span className="text-xs font-medium text-gray-600">{label}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <StarDisplay value={val} />
                                    <span className="text-sm font-bold text-gray-900">{val}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Existing reply */}
                        {review.reply && (
                          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Sizning javobingiz</p>
                            </div>
                            <p className="text-sm text-blue-800 leading-relaxed">{review.reply}</p>
                          </div>
                        )}

                        {/* Reply form */}
                        {!review.reply && (
                          <div>
                            {isReplying ? (
                              <div className="space-y-3">
                                <div className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-1">
                                  <textarea
                                    className="w-full rounded-lg bg-white p-3 text-sm focus:outline-none resize-none"
                                    rows={3}
                                    placeholder="Mijozga javobingizni yozing... Professional va samimiy bo'ling."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    autoFocus
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="primary" icon={<Send className="h-4 w-4" />}
                                    loading={replyMutation.isPending}
                                    onClick={() => replyText.trim() && replyMutation.mutate({ id: review.id, reply: replyText.trim() })}
                                  >
                                    Yuborish
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => { setReplyingId(null); setReplyText('') }}>
                                    Bekor qilish
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button size="sm" variant="secondary" icon={<MessageSquare className="h-4 w-4" />}
                                onClick={(e) => { e.stopPropagation(); setReplyingId(review.id) }}
                              >
                                Javob berish
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
