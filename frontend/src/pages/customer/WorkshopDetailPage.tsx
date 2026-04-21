import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BadgeCheck, MapPin, Clock, Phone, ChevronRight, Wrench,
  Heart, Star, Users, Calendar, Shield, Share2, MessageSquare, Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { cn, formatPrice } from '@/shared/lib/utils'
import api from '@/shared/api/axios'

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const DAY_LABELS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={cn('h-4 w-4', i <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
      ))}
    </div>
  )
}

export default function WorkshopDetailPage() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const mapRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'info' | 'services' | 'reviews'>('info')

  const { data: workshop, isLoading } = useQuery({
    queryKey: ['workshop', slug],
    queryFn: () => api.get(`/workshops/${slug}`).then(r => r.data).catch(() => null),
    enabled: !!slug,
  })

  const { data: reviews } = useQuery({
    queryKey: ['ws-reviews', workshop?.id],
    queryFn: () => api.get(`/reviews/workshop/${workshop.id}`).then(r => r.data).catch(() => ({ items: [] })),
    enabled: !!workshop?.id,
  })

  const { data: favStatus } = useQuery({
    queryKey: ['fav-status', workshop?.id],
    queryFn: () => api.get('/users/me/favorites').then(r => {
      const list = r.data?.items || (Array.isArray(r.data) ? r.data : [])
      return list.some((f: any) => f.workshop_id === workshop?.id || f.id === workshop?.id)
    }).catch(() => false),
    enabled: !!workshop?.id,
  })

  const toggleFav = useMutation({
    mutationFn: () => favStatus ? api.delete(`/users/me/favorites/${workshop.id}`) : api.post(`/users/me/favorites/${workshop.id}`),
    onSuccess: () => { toast.success(favStatus ? 'Olib tashlandi' : "Qo'shildi"); qc.invalidateQueries({ queryKey: ['fav-status'] }) },
    onError: () => toast.error('Xatolik'),
  })

  // Map
  useEffect(() => {
    if (!workshop?.latitude || !workshop?.longitude || !mapRef.current) return
    const L = (window as any).L
    if (!L) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => initMap()
      document.head.appendChild(script)
    } else {
      initMap()
    }
    function initMap() {
      const L2 = (window as any).L
      if (!L2 || !mapRef.current) return
      const map = L2.map(mapRef.current).setView([workshop.latitude, workshop.longitude], 15)
      L2.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map)
      const color = '#3b82f6'
      const icon = L2.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${color};color:white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:40px;height:40px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:3px solid white;font-size:12px;font-weight:800;"><span style="transform:rotate(45deg)">★</span></div>`,
        iconSize: [40, 40], iconAnchor: [20, 40],
      })
      L2.marker([workshop.latitude, workshop.longitude], { icon }).addTo(map)
      return () => map.remove()
    }
  }, [workshop?.latitude, workshop?.longitude])

  if (isLoading) return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (!workshop) return null

  const photos = workshop.photos || []
  const services = workshop.services || []
  const schedules = workshop.schedules || []
  const reviewList = reviews?.items || reviews?.results || (Array.isArray(reviews) ? reviews : [])
  const rating = workshop.rating_avg || 0
  const totalReviews = workshop.total_reviews || 0

  // Working hours today
  const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const todaySchedule = schedules.find((s: any) => s.day_of_week === todayDow)
  const isOpen = todaySchedule && !todaySchedule.is_closed

  return (
    <div className="relative mx-auto max-w-lg pb-36 md:pb-24">
      {/* Hero Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100">
        {photos.length > 0 && photos[0]?.url ? (
          <img src={photos[0].url} alt={workshop.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin className="h-16 w-16 text-blue-200" />
          </div>
        )}
        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur-sm"><ArrowLeft className="h-5 w-5 text-gray-700" /></button>
          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleFav.mutate()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur-sm">
              <Heart className={cn('h-5 w-5', favStatus ? 'fill-red-500 text-red-500' : 'text-gray-700')} />
            </motion.button>
          </div>
        </div>
        {/* Rating overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-sm px-3 py-1.5 shadow-lg">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span className="text-sm font-extrabold text-gray-900">{rating.toFixed(1)}</span>
            <span className="text-xs text-gray-500">({totalReviews})</span>
          </div>
          {workshop.is_verified && (
            <div className="flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1.5 shadow-lg">
              <BadgeCheck className="h-3.5 w-3.5 text-white" />
              <span className="text-[10px] font-bold text-white">Verified</span>
            </div>
          )}
        </div>
        {photos.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium text-white">
            <ImageIcon className="h-3 w-3 inline mr-0.5" />1/{photos.length}
          </span>
        )}
      </div>

      <motion.div initial="hidden" animate="show" className="px-4 pt-4 space-y-5">
        {/* Name + Info */}
        <motion.div variants={fadeUp}>
          <h1 className="text-xl font-extrabold text-gray-900">{workshop.name}</h1>
          {workshop.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{workshop.description}</p>}

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
              <span>{workshop.address}</span>
            </div>
            {workshop.phone && (
              <a href={`tel:${workshop.phone}`} className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                <Phone className="h-4 w-4 shrink-0" />
                {workshop.phone}
              </a>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400 shrink-0" />
              <Badge variant={isOpen ? 'success' : 'danger'} size="sm">{isOpen ? 'Ochiq' : 'Yopiq'}</Badge>
              {todaySchedule && !todaySchedule.is_closed && (
                <span className="text-gray-500">{todaySchedule.open_time?.slice(0,5)} - {todaySchedule.close_time?.slice(0,5)}</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="text-lg font-extrabold text-amber-700">{rating.toFixed(1)}</span>
            </div>
            <p className="text-[10px] font-semibold text-amber-600 mt-0.5">Reyting</p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-lg font-extrabold text-blue-700">{totalReviews}</span>
            </div>
            <p className="text-[10px] font-semibold text-blue-600 mt-0.5">Sharhlar</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-4 w-4 text-emerald-500" />
              <span className="text-lg font-extrabold text-emerald-700">{totalReviews}+</span>
            </div>
            <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">Mijozlar</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={fadeUp} className="flex rounded-xl bg-gray-100 p-1">
          {[
            { key: 'info' as const, label: 'Ma\'lumot' },
            { key: 'services' as const, label: `Xizmatlar (${services.length})` },
            { key: 'reviews' as const, label: `Sharhlar (${reviewList.length})` },
          ].map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={cn('flex-1 rounded-lg py-2 text-xs font-semibold transition-all',
                tab === tb.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              )}
            >{tb.label}</button>
          ))}
        </motion.div>

        {/* Tab Content */}
        {tab === 'info' && (
          <motion.div variants={fadeUp} className="space-y-4">
            {/* Map */}
            {workshop.latitude && workshop.longitude && (
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: '200px' }}>
                <div ref={mapRef} className="h-full w-full" />
              </div>
            )}

            {/* Schedule */}
            {schedules.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-500" /> Ish grafigi</h3>
                <div className="space-y-1.5">
                  {schedules.sort((a: any, b: any) => a.day_of_week - b.day_of_week).map((s: any) => (
                    <div key={s.day_of_week} className={cn('flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                      s.day_of_week === todayDow ? 'bg-blue-50 font-semibold' : ''
                    )}>
                      <span className={cn('text-gray-700', s.is_closed && 'text-gray-400')}>{DAY_LABELS[s.day_of_week] || s.day_of_week}</span>
                      {s.is_closed ? (
                        <span className="text-xs text-red-500 font-medium">Yopiq</span>
                      ) : (
                        <span className="text-gray-600 font-mono text-xs">{s.open_time?.slice(0,5)} - {s.close_time?.slice(0,5)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificates */}
            {workshop.certificates && workshop.certificates.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-500" /> Sertifikatlar</h3>
                {workshop.certificates.map((c: any) => (
                  <div key={c.id} className="text-sm text-gray-600">{c.title} — {c.issued_by}</div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'services' && (
          <motion.div variants={fadeUp} className="space-y-2">
            {services.map((s: any) => (
              <div key={s.id || s.name} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <Wrench className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.duration_minutes || s.duration || '—'} daqiqa</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(s.price_from || 0)}</p>
                  {s.price_to && s.price_to !== s.price_from && (
                    <p className="text-[10px] text-gray-400">— {formatPrice(s.price_to)}</p>
                  )}
                </div>
              </div>
            ))}
            {services.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">Xizmatlar ro'yxati bo'sh</div>
            )}
          </motion.div>
        )}

        {tab === 'reviews' && (
          <motion.div variants={fadeUp} className="space-y-3">
            {reviewList.length > 0 ? reviewList.slice(0, 10).map((r: any) => (
              <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                    {(r.customer_name || r.author_name || 'M').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">{r.customer_name || r.author_name || 'Mijoz'}</span>
                      <div className="flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="text-[11px] font-bold text-amber-700">{(r.rating_overall || r.rating || 0).toFixed(1)}</span>
                      </div>
                    </div>
                    {/* Sub ratings */}
                    <div className="flex gap-3 mt-1.5 text-[10px] text-gray-500">
                      {r.rating_quality && <span>Sifat: <b>{r.rating_quality}</b></span>}
                      {r.rating_price && <span>Narx: <b>{r.rating_price}</b></span>}
                      {r.rating_time && <span>Vaqt: <b>{r.rating_time}</b></span>}
                    </div>
                    {r.comment && <p className="mt-2 text-sm text-gray-600">{r.comment}</p>}
                    {r.reply && (
                      <div className="mt-2 rounded-lg bg-blue-50 p-2.5">
                        <p className="text-[10px] font-bold text-blue-700 mb-0.5">Ustaxona javobi</p>
                        <p className="text-xs text-blue-800">{r.reply}</p>
                      </div>
                    )}
                    <p className="mt-1.5 text-[10px] text-gray-400">{r.created_at ? new Date(r.created_at).toLocaleDateString('uz', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-sm text-gray-400">Hali sharhlar yo'q</div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Sticky CTA — above mobile nav */}
      <div className="fixed inset-x-0 bottom-[60px] md:bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-md p-3 md:p-4 md:static md:mt-6 md:border-0 md:bg-transparent md:px-4">
        <div className="mx-auto max-w-lg flex gap-3">
          {workshop.phone && (
            <a href={`tel:${workshop.phone}`} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-600">
              <Phone className="h-5 w-5" />
            </a>
          )}
          <Button fullWidth size="lg" onClick={() => navigate('/booking/confirm', { state: { workshop } })}
            icon={<ChevronRight className="h-5 w-5" />} className="h-12 rounded-xl text-base font-bold"
          >
            Band qilish
          </Button>
        </div>
      </div>
    </div>
  )
}
