import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, SlidersHorizontal, X, Star, MapPin, ShieldCheck,
  Truck, BadgeCheck, List, Map as MapIcon, Phone, Clock, ChevronRight,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/components/Input'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { EmptyState } from '@/shared/components/EmptyState'
import { Badge } from '@/shared/components/Badge'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { cn, formatPrice } from '@/shared/lib/utils'
import api from '@/shared/api/axios'

const sortFilters = [
  { key: 'all', label: 'Hammasi' },
  { key: 'nearest', label: 'Eng yaqin' },
  { key: 'cheapest', label: 'Eng arzon' },
  { key: 'top_rated', label: 'Yuqori reyting' },
]

const categories = [
  'Moy almashtirish', 'Diagnostika', 'Tormoz tizimi', 'Shinalar',
  'Dvigatel', 'Elektr tizimi', 'Kuzov', 'Konditsioner',
]

const ratingOptions = [
  { label: '3+', value: 3 }, { label: '4+', value: 4 }, { label: '4.5+', value: 4.5 },
]

// Urganch center
const DEFAULT_CENTER: [number, number] = [41.5513, 60.6317]

export default function SearchPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || ''
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const debouncedQuery = useDebounce(query, 300)

  // Filters
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [minRating, setMinRating] = useState<number | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [hasHomeService, setHasHomeService] = useState(false)

  const activeFilterCount = selectedCats.length + (minRating ? 1 : 0) + (isVerified ? 1 : 0) + (hasHomeService ? 1 : 0)

  const { data, isLoading } = useQuery({
    queryKey: ['workshops', debouncedQuery, activeFilter, selectedCats, minRating, isVerified, hasHomeService, initialCategory],
    queryFn: () => {
      const p = new URLSearchParams()
      if (debouncedQuery) p.set('search', debouncedQuery)
      if (activeFilter !== 'all') p.set('sort', activeFilter)
      // Category from URL or filter chips
      if (initialCategory && !selectedCats.length) p.set('category', initialCategory)
      else if (selectedCats.length) p.set('category', selectedCats.join(','))
      if (minRating) p.set('rating_min', String(minRating))
      if (isVerified) p.set('is_verified', 'true')
      if (hasHomeService) p.set('has_mobile', 'true')
      p.set('limit', '50')
      return api.get(`/workshops/?${p}`).then(r => r.data).catch(() => [])
    },
  })

  const workshops = data?.items || data?.results || (Array.isArray(data) ? data : [])

  return (
    <div className="mx-auto max-w-lg px-4 py-3 md:max-w-5xl">
      {/* Search + View Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('common.search') + '...'}
            iconLeft={<Search className="h-4 w-4" />} className="h-11 rounded-xl pr-12" />
          <button onClick={() => setFilterOpen(!filterOpen)}
            className={cn('absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              filterOpen || activeFilterCount > 0 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-100'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{activeFilterCount}</span>
            )}
          </button>
        </div>
        {/* View mode toggle */}
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <button onClick={() => setViewMode('list')}
            className={cn('rounded-lg p-2 transition-all', viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}
          >
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('map')}
            className={cn('rounded-lg p-2 transition-all', viewMode === 'map' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}
          >
            <MapIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sort chips */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {sortFilters.map(f => (
          <button key={f.key} onClick={() => setActiveFilter(f.key)}
            className={cn('shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all',
              activeFilter === f.key ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}
          >{f.label}</button>
        ))}
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {filterOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Filtrlar</h3>
                {activeFilterCount > 0 && (
                  <button onClick={() => { setSelectedCats([]); setMinRating(null); setIsVerified(false); setHasHomeService(false) }}
                    className="text-xs text-red-500 font-semibold">Tozalash</button>
                )}
              </div>
              {/* Categories */}
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-500 uppercase">Kategoriya</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button key={c} onClick={() => setSelectedCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                      className={cn('rounded-full px-3 py-1.5 text-xs font-medium transition-all border',
                        selectedCats.includes(c) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      )}
                    >{c}</button>
                  ))}
                </div>
              </div>
              {/* Rating */}
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-500 uppercase">Reyting</p>
                <div className="flex gap-2">
                  {ratingOptions.map(r => (
                    <button key={r.value} onClick={() => setMinRating(minRating === r.value ? null : r.value)}
                      className={cn('flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                        minRating === r.value ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200'
                      )}
                    ><Star className="h-3 w-3" />{r.label}</button>
                  ))}
                </div>
              </div>
              {/* Toggles */}
              <div className="flex gap-3">
                <button onClick={() => setIsVerified(!isVerified)}
                  className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                    isVerified ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200'
                  )}><ShieldCheck className="h-3 w-3" />Verified</button>
                <button onClick={() => setHasHomeService(!hasHomeService)}
                  className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                    hasHomeService ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'
                  )}><Truck className="h-3 w-3" />Uyga chiqadi</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">{workshops.length} ta ustaxona topildi</p>
      </div>

      {/* Content */}
      <div className="mt-3">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>
        ) : !workshops.length ? (
          <EmptyState icon={<Search className="h-8 w-8" />} title="Ustaxona topilmadi" description="Boshqa filtrlar bilan sinab ko'ring" />
        ) : viewMode === 'list' ? (
          <ListMode workshops={workshops} navigate={navigate} />
        ) : (
          <MapMode workshops={workshops} navigate={navigate} />
        )}
      </div>
    </div>
  )
}

/* ==================== LIST MODE ==================== */
function ListMode({ workshops, navigate }: { workshops: any[]; navigate: any }) {
  return (
    <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {workshops.map((ws: any, i: number) => (
        <motion.div key={ws.id || i}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          onClick={() => navigate(`/workshop/${ws.slug || ws.id}`)}
          className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
        >
          {/* Photo */}
          <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden">
            {ws.main_photo_url || (ws.photos && ws.photos[0]?.url) ? (
              <img src={ws.main_photo_url || ws.photos[0].url} alt="" className="h-full w-full object-cover" />
            ) : (
              <MapPin className="h-8 w-8 text-blue-300" />
            )}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 truncate">{ws.name}</h3>
              {ws.is_verified && <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span className="text-[11px] font-bold text-amber-700">{(ws.rating_avg || 0).toFixed(1)}</span>
              </div>
              <span className="text-[11px] text-gray-400">({ws.total_reviews || 0} sharh)</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />{ws.address || ws.city}
            </p>
            {ws.services && ws.services.length > 0 && (
              <div className="flex gap-1.5 mt-2 overflow-hidden">
                {ws.services.slice(0, 2).map((s: any) => (
                  <span key={s.id || s.name} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full truncate">
                    {s.name}
                  </span>
                ))}
                {ws.services.length > 2 && (
                  <span className="text-[10px] text-gray-400">+{ws.services.length - 2}</span>
                )}
              </div>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300 self-center shrink-0" />
        </motion.div>
      ))}
    </motion.div>
  )
}

/* ==================== MAP MODE ==================== */
function MapMode({ workshops, navigate }: { workshops: any[]; navigate: any }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)
  const [selectedWs, setSelectedWs] = useState<any>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Load Leaflet JS
    if (!(window as any).L) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => setMapReady(true)
      document.head.appendChild(script)
    } else {
      setMapReady(true)
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return
    const L = (window as any).L
    if (!L) return

    // Find center — use first workshop or default Urganch
    const hasCoords = workshops.filter(w => w.latitude && w.longitude)
    const center: [number, number] = hasCoords.length > 0
      ? [hasCoords[0].latitude, hasCoords[0].longitude]
      : DEFAULT_CENTER

    const map = L.map(mapRef.current).setView(center, 13)
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)

    // Add markers
    workshops.forEach((ws: any) => {
      if (!ws.latitude || !ws.longitude) return

      const rating = (ws.rating_avg || 0).toFixed(1)
      const color = ws.rating_avg >= 4.5 ? '#10b981' : ws.rating_avg >= 4 ? '#3b82f6' : ws.rating_avg >= 3 ? '#f59e0b' : '#ef4444'

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background: ${color};
          color: white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid white;
          font-size: 11px; font-weight: 800;
        "><span style="transform: rotate(45deg)">${rating}</span></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      })

      const marker = L.marker([ws.latitude, ws.longitude], { icon }).addTo(map)

      marker.bindPopup(`
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${ws.name}</div>
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <span style="background: ${color}; color: white; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 700;">★ ${rating}</span>
            <span style="color: #9ca3af; font-size: 11px;">(${ws.total_reviews || 0} sharh)</span>
          </div>
          <div style="color: #6b7280; font-size: 12px; margin-bottom: 6px;">${ws.address || ws.city || ''}</div>
          ${ws.is_verified ? '<div style="color: #3b82f6; font-size: 11px; font-weight: 600;">✓ Verified Partner</div>' : ''}
        </div>
      `, { closeButton: true, maxWidth: 250 })

      marker.on('click', () => setSelectedWs(ws))
    })

    // Fit bounds if multiple
    if (hasCoords.length > 1) {
      const bounds = L.latLngBounds(hasCoords.map((w: any) => [w.latitude, w.longitude]))
      map.fitBounds(bounds, { padding: [30, 30] })
    }

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [mapReady, workshops])

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 'calc(100vh - 220px)', minHeight: '300px', maxHeight: '500px' }}>
        <div ref={mapRef} className="h-full w-full" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <LoadingSpinner size="lg" label="Xarita yuklanmoqda..." />
          </div>
        )}
        {/* Workshop count overlay */}
        <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-md border border-gray-100">
          <p className="text-xs font-semibold text-gray-700">
            <MapPin className="h-3 w-3 inline mr-1 text-blue-500" />{workshops.filter(w => w.latitude).length} ta ustaxona
          </p>
        </div>
      </div>

      {/* Selected workshop detail */}
      <AnimatePresence>
        {selectedWs && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => navigate(`/workshop/${selectedWs.slug || selectedWs.id}`)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">{selectedWs.name}</h3>
                  {selectedWs.is_verified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-amber-700">{(selectedWs.rating_avg || 0).toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-gray-500">{selectedWs.total_reviews || 0} sharh</span>
                </div>
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedWs.address}</p>
              </div>
              <button className="rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1">
                Ko'rish <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workshop list below map */}
      <div className="space-y-2">
        {workshops.slice(0, 5).map((ws: any) => (
          <div key={ws.id}
            onClick={() => { setSelectedWs(ws); navigate(`/workshop/${ws.slug || ws.id}`) }}
            className={cn('flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md',
              selectedWs?.id === ws.id ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-white'
            )}
          >
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold',
              ws.rating_avg >= 4.5 ? 'bg-emerald-500' : ws.rating_avg >= 4 ? 'bg-blue-500' : 'bg-amber-500'
            )}>
              {(ws.rating_avg || 0).toFixed(1)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{ws.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{ws.address || ws.city}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
