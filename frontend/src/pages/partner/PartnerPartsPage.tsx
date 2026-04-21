import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, ShoppingCart, Plus, Minus, Trash2, CheckCircle,
  Truck, Clock, XCircle, Box, Car, User, Calendar, ChevronDown, ChevronUp,
  ArrowRight, MapPin, Banknote, AlertCircle, ArrowLeft, ChevronRight, BarChart3, Award, TrendingUp,
} from 'lucide-react'
import api from '@/shared/api/axios'
import { cn, formatPrice } from '@/shared/lib/utils'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Badge } from '@/shared/components/Badge'
import { Modal } from '@/shared/components/Modal'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { EmptyState } from '@/shared/components/EmptyState'
import { toast } from 'sonner'

type Tab = 'catalog' | 'orders' | 'stats'
type CatalogStep = 'vehicles' | 'categories' | 'parts'
interface CartItem { part_id: string; name: string; price: number; quantity: number }
interface VehicleModel { id: string; name: string; year_from?: number; image_url?: string; brand_name?: string }

const ORDER_STATUS: Record<string, { label: string; color: string; icon: any; action?: { url: string; label: string } }> = {
  pending:            { label: 'Admin kutmoqda', color: 'bg-amber-50 border-amber-200 text-amber-700', icon: Clock },
  admin_reviewed:     { label: 'Admin ko\'rib chiqdi', color: 'bg-blue-50 border-blue-200 text-blue-700', icon: CheckCircle, action: { url: 'confirm', label: 'Tasdiqlash' } },
  partner_confirmed:  { label: 'Siz tasdiqladingiz', color: 'bg-indigo-50 border-indigo-200 text-indigo-700', icon: CheckCircle },
  shipped:            { label: 'Yo\'lda', color: 'bg-purple-50 border-purple-200 text-purple-700', icon: Truck, action: { url: 'received', label: 'Qabul qildim' } },
  partner_received:   { label: 'Qabul qilindi', color: 'bg-teal-50 border-teal-200 text-teal-700', icon: CheckCircle },
  delivered:          { label: 'Yakunlangan', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: CheckCircle },
  cancelled:          { label: 'Bekor', color: 'bg-red-50 border-red-200 text-red-500', icon: XCircle },
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('uz', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function PartnerPartsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('orders')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderOpen, setOrderOpen] = useState(false)
  const [deliveryAddr, setDeliveryAddr] = useState('')
  const [selectedBooking, setSelectedBooking] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [catalogStep, setCatalogStep] = useState<CatalogStep>('vehicles')
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleModel | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Queries
  const { data: vehicleBrands, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicle-brands'],
    queryFn: () => api.get('/users/vehicle-brands').then(r => {
      const d = r.data
      return Array.isArray(d) ? d : d?.items || d?.results || []
    }).catch(() => []),
    enabled: tab === 'catalog',
  })

  const vehicleModels: VehicleModel[] = (Array.isArray(vehicleBrands) ? vehicleBrands : []).flatMap((brand: any) =>
    (brand.models || []).map((m: any) => ({ ...m, brand_name: brand.name }))
  )

  const { data: partsData, isLoading: partsLoading } = useQuery({
    queryKey: ['p-parts', selectedVehicle?.id, selectedCategory],
    queryFn: () => {
      const p: Record<string, string> = { limit: '50' }
      if (selectedVehicle) p.vehicle_model_id = selectedVehicle.id
      if (selectedCategory) p.category = selectedCategory
      return api.get('/partner/parts/catalog', { params: p }).then(r => {
        const d = r.data
        return d?.items || d?.results || (Array.isArray(d) ? d : [])
      }).catch(() => [])
    },
    enabled: tab === 'catalog' && catalogStep === 'parts' && !!selectedVehicle,
  })

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['p-orders'],
    queryFn: () => api.get('/partner/parts/orders', { params: { limit: 50 } }).then(r => {
      const d = r.data
      return d?.items || d?.results || (Array.isArray(d) ? d : [])
    }).catch(() => []),
  })

  const { data: bookings } = useQuery({
    queryKey: ['p-bookings-for-parts'],
    queryFn: () => api.get('/partner/bookings', { params: { limit: 20 } }).then(r => r.data?.items || []).catch(() => []),
  })

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['p-cats'],
    queryFn: () => api.get('/parts/categories').then(r => {
      const d = r.data
      return Array.isArray(d) ? d : d?.items || d?.results || []
    }).catch(() => []),
    enabled: tab === 'catalog',
  })

  const [statsPeriod, setStatsPeriod] = useState('monthly')
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['p-parts-stats', statsPeriod],
    queryFn: () => api.get('/partner/parts/stats', { params: { period: statsPeriod } }).then(r => r.data).catch(() => null),
    enabled: tab === 'stats',
  })

  const orderMutation = useMutation({
    mutationFn: () => api.post('/partner/parts/order', {
      items: cart.map(c => ({ part_id: c.part_id, quantity: c.quantity })),
      delivery_address: deliveryAddr || 'Ustaxona manzili',
      booking_id: selectedBooking || null,
    }),
    onSuccess: () => {
      toast.success('Buyurtma berildi!')
      setCart([])
      setOrderOpen(false)
      setSelectedBooking('')
      qc.invalidateQueries({ queryKey: ['p-orders'] })
      setTab('orders')
    },
    onError: () => toast.error('Xatolik'),
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) =>
      api.patch(`/partner/parts/orders/${id}/${url}`),
    onSuccess: () => { toast.success('Muvaffaqiyatli!'); qc.invalidateQueries({ queryKey: ['p-orders'] }) },
    onError: () => toast.error('Xatolik'),
  })

  const parts = Array.isArray(partsData) ? partsData : []
  const orders = Array.isArray(ordersData) ? ordersData : []
  const cats = Array.isArray(categories) ? categories : []
  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0)

  const addToCart = (p: any) => {
    setCart(prev => {
      const exists = prev.find(c => c.part_id === p.id)
      if (exists) return prev.map(c => c.part_id === p.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { part_id: p.id, name: p.name, price: p.price || p.price_wholesale || 0, quantity: 1 }]
    })
    toast.success(`${p.name} savatchaga qo'shildi`)
  }

  // Order counts
  const pendingOrders = orders.filter((o: any) => o.status === 'pending' || o.status === 'admin_reviewed').length
  const activeOrders = orders.filter((o: any) => ['partner_confirmed', 'shipped'].includes(o.status)).length

  return (
    <motion.div className="space-y-5 p-4 md:p-6" variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-200">
          <Package className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Ehtiyot Qismlar</h1>
          <p className="text-sm text-gray-500">Buyurtma bering va kuzating</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex rounded-xl bg-gray-100 p-1">
        <button onClick={() => setTab('orders')}
          className={cn('flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all',
            tab === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          )}
        >
          <Truck className="h-4 w-4" />
          Buyurtmalarim
          {(pendingOrders + activeOrders) > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {pendingOrders + activeOrders}
            </span>
          )}
        </button>
        <button onClick={() => setTab('catalog')}
          className={cn('flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all',
            tab === 'catalog' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          )}
        >
          <Package className="h-4 w-4" />
          Katalog
          {cart.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
              {cart.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('stats')}
          className={cn('flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all',
            tab === 'stats' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          )}
        >
          <BarChart3 className="h-4 w-4" />
          Statistika
        </button>
      </motion.div>

      {/* ============ ORDERS TAB ============ */}
      {tab === 'orders' && (
        <motion.div variants={fadeUp} className="space-y-3">
          {ordersLoading ? (
            <div className="flex h-40 items-center justify-center"><LoadingSpinner size="lg" /></div>
          ) : !orders.length ? (
            <EmptyState icon={<Truck className="h-8 w-8" />} title="Buyurtmalar yo'q"
              description="Katalogdan qism buyurtma bering" actionLabel="Katalogga o'tish" onAction={() => setTab('catalog')} />
          ) : (
            <AnimatePresence mode="popLayout">
              {orders.map((o: any) => {
                const cfg = ORDER_STATUS[o.status] || ORDER_STATUS.pending
                const isOpen = expandedOrder === o.id
                return (
                  <motion.div key={o.id} layout variants={fadeUp}
                    className={cn('rounded-2xl border-2 bg-white shadow-sm overflow-hidden transition-all', cfg.color.split(' ')[1])}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedOrder(isOpen ? null : o.id)}>
                      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', cfg.color.split(' ')[0])}>
                        <cfg.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('text-xs font-bold uppercase tracking-wider', cfg.color.split(' ')[2])}>{cfg.label}</span>
                          <span className="text-[10px] font-mono text-gray-400">#{String(o.id).slice(0, 6)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{fmtDate(o.created_at)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-extrabold text-gray-900">{formatPrice(o.total_amount || 0)}</p>
                      </div>
                      <div className="text-gray-300">{isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</div>
                    </div>

                    {/* Expanded */}
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t border-gray-100">
                        <div className="p-4 space-y-3">
                          {/* Booking info */}
                          {o.booking_id && (
                            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                              <p className="text-[10px] font-bold text-blue-700 uppercase flex items-center gap-1"><Car className="h-3 w-3" />Mijoz buyurtmasi uchun</p>
                              <p className="text-sm font-semibold text-blue-900 mt-0.5">Buyurtma #{String(o.booking_id).slice(0, 8)}</p>
                            </div>
                          )}

                          {/* Items */}
                          {o.items && o.items.length > 0 && (
                            <div className="space-y-1.5">
                              {o.items.map((it: any, i: number) => (
                                <div key={i} className={cn('flex items-center gap-2 rounded-lg p-2.5 text-sm',
                                  it.is_available === false ? 'bg-red-50 border border-red-100' : 'bg-gray-50'
                                )}>
                                  <Box className={cn('h-4 w-4 shrink-0', it.is_available === false ? 'text-red-400' : 'text-gray-400')} />
                                  <span className={cn('flex-1 font-medium', it.is_available === false && 'line-through text-red-500')}>{it.part_name}</span>
                                  <span className="text-xs text-gray-500">{it.quantity} x {formatPrice(it.unit_price || 0)}</span>
                                  {it.is_available === false && <Badge variant="danger" size="sm">Yo'q</Badge>}
                                  {it.admin_note && <span className="text-[10px] text-orange-600">({it.admin_note})</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Action */}
                          {cfg.action && (
                            <Button size="sm" loading={actionMutation.isPending}
                              onClick={() => actionMutation.mutate({ id: o.id, url: cfg.action!.url })}
                              icon={<ArrowRight className="h-4 w-4" />}
                              className="bg-blue-600 hover:bg-blue-700 w-full"
                            >
                              {cfg.action.label}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </motion.div>
      )}

      {/* ============ CATALOG TAB ============ */}
      {tab === 'catalog' && (
        <motion.div variants={fadeUp} className="space-y-4">
          <div>
            {/* ---- STEP 1: Vehicle Selection ---- */}
            {catalogStep === 'vehicles' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-bold text-gray-900">Avtomobil tanlang</h2>
                </div>

                {vehiclesLoading ? (
                  <div className="flex h-40 items-center justify-center"><LoadingSpinner size="lg" /></div>
                ) : !vehicleModels.length ? (
                  <EmptyState icon={<Car className="h-8 w-8" />} title="Avtomobillar topilmadi" />
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {vehicleModels.map((vm) => (
                      <motion.button key={vm.id} whileTap={{ scale: 0.97 }}
                        onClick={() => { setSelectedVehicle(vm); setCatalogStep('categories') }}
                        className="group flex flex-col items-center rounded-2xl border-2 border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-orange-300 hover:shadow-md"
                      >
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-gray-50 mb-3">
                          {vm.image_url ? (
                            <img src={vm.image_url} alt={vm.name} className="h-full w-full object-cover rounded-xl" />
                          ) : (
                            <Car className="h-10 w-10 text-gray-300 group-hover:text-orange-400 transition-colors" />
                          )}
                        </div>
                        <p className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{vm.name}</p>
                        {vm.year_from && <p className="text-xs text-gray-400 mt-0.5">{vm.year_from}+</p>}
                        {vm.brand_name && <p className="text-[10px] text-gray-400 mt-0.5">{vm.brand_name}</p>}
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ---- STEP 2: Category Selection ---- */}
            {catalogStep === 'categories' && selectedVehicle && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setCatalogStep('vehicles'); setSelectedVehicle(null) }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <ArrowLeft className="h-4 w-4 text-gray-600" />
                  </button>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Car className="h-4 w-4 text-orange-500" />
                    <span className="font-bold text-gray-900">{selectedVehicle.name}</span>
                    {selectedVehicle.year_from && <span className="text-gray-400">({selectedVehicle.year_from}+)</span>}
                  </div>
                </div>

                <h2 className="text-lg font-bold text-gray-900">Kategoriya tanlang</h2>

                {catsLoading ? (
                  <div className="flex h-40 items-center justify-center"><LoadingSpinner size="lg" /></div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={() => { setSelectedCategory(null); setCatalogStep('parts') }}
                      className="flex items-center gap-2 rounded-xl border-2 border-orange-200 bg-orange-50 p-3 text-left transition-all hover:border-orange-400 hover:shadow-md"
                    >
                      <Package className="h-5 w-5 text-orange-500 shrink-0" />
                      <span className="text-sm font-bold text-orange-700">Barchasi</span>
                      <ChevronRight className="h-4 w-4 text-orange-400 ml-auto" />
                    </motion.button>
                    {cats.map((c: any) => (
                      <motion.button key={c.id || c.name} whileTap={{ scale: 0.97 }}
                        onClick={() => { setSelectedCategory(c.name); setCatalogStep('parts') }}
                        className="flex items-center gap-2 rounded-xl border-2 border-gray-100 bg-white p-3 text-left transition-all hover:border-orange-300 hover:shadow-md"
                      >
                        <Box className="h-5 w-5 text-gray-400 shrink-0" />
                        <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                        <ChevronRight className="h-4 w-4 text-gray-300 ml-auto" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ---- STEP 3: Parts List ---- */}
            {catalogStep === 'parts' && selectedVehicle && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => { setCatalogStep('vehicles'); setSelectedVehicle(null); setSelectedCategory(null) }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <ArrowLeft className="h-4 w-4 text-gray-600" />
                  </button>
                  <div className="flex items-center gap-1 text-sm flex-wrap">
                    <button onClick={() => { setCatalogStep('vehicles'); setSelectedVehicle(null); setSelectedCategory(null) }}
                      className="text-orange-500 hover:text-orange-700 font-medium">Avtomobillar</button>
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                    <button onClick={() => { setCatalogStep('categories'); setSelectedCategory(null) }}
                      className="text-orange-500 hover:text-orange-700 font-medium">{selectedVehicle.name}</button>
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                    <span className="font-bold text-gray-900">{selectedCategory || 'Barchasi'}</span>
                  </div>
                </div>

                {/* Parts */}
                {partsLoading ? (
                  <div className="flex h-40 items-center justify-center"><LoadingSpinner size="lg" /></div>
                ) : !parts.length ? (
                  <EmptyState icon={<Package className="h-8 w-8" />} title="Mahsulotlar topilmadi"
                    description="Boshqa kategoriyani tanlang"
                    actionLabel="Orqaga" onAction={() => setCatalogStep('categories')} />
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {parts.map((p: any) => {
                      const inCart = cart.find(c => c.part_id === p.id)
                      return (
                        <motion.div key={p.id} variants={fadeUp}
                          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                            <Box className="h-5 w-5 text-orange-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.brand} · {p.category}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-gray-900">{formatPrice(p.price || p.price_wholesale || 0)}</p>
                            {inCart ? (
                              <div className="flex items-center gap-1 mt-1">
                                <button onClick={() => setCart(prev => prev.map(c => c.part_id === p.id ? { ...c, quantity: Math.max(1, c.quantity - 1) } : c))}
                                  className="h-6 w-6 rounded bg-gray-100 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                                <span className="text-xs font-bold w-5 text-center">{inCart.quantity}</span>
                                <button onClick={() => setCart(prev => prev.map(c => c.part_id === p.id ? { ...c, quantity: c.quantity + 1 } : c))}
                                  className="h-6 w-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(p)}
                                className="mt-1 rounded-lg bg-orange-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-orange-600">
                                <Plus className="h-3 w-3 inline" /> Qo'shish
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="sticky bottom-20 md:bottom-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 p-4 text-white shadow-xl shadow-orange-500/25"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-100">{cart.length} ta mahsulot · {cart.reduce((s, c) => s + c.quantity, 0)} dona</p>
                  <p className="text-xl font-extrabold">{formatPrice(cartTotal)}</p>
                </div>
                <Button onClick={() => setOrderOpen(true)}
                  className="bg-white text-orange-600 hover:bg-orange-50 font-bold"
                  icon={<ShoppingCart className="h-4 w-4" />}
                >
                  Buyurtma berish
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ============ STATS TAB ============ */}
      {tab === 'stats' && (
        <motion.div variants={fadeUp} className="space-y-5">
          {/* Period selector */}
          <div className="flex rounded-xl bg-gray-100 p-1">
            {[{k:'weekly',l:'Haftalik'},{k:'monthly',l:'Oylik'},{k:'yearly',l:'Yillik'}].map(p => (
              <button key={p.k} onClick={() => setStatsPeriod(p.k)}
                className={cn('flex-1 rounded-lg py-2 text-xs font-semibold transition-all',
                  statsPeriod === p.k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                )}>{p.l}</button>
            ))}
          </div>

          {statsLoading ? (
            <div className="flex h-40 items-center justify-center"><LoadingSpinner size="lg" /></div>
          ) : !statsData ? (
            <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="Statistika yo'q" />
          ) : (
            <>
              {/* Bonus Card */}
              <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 p-5 text-white shadow-xl shadow-purple-500/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-purple-200 uppercase tracking-wider font-semibold">Bonus balans</p>
                    <p className="text-3xl font-extrabold mt-1">{formatPrice(statsData.wallet?.balance || 0)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1">
                        <Award className="h-3 w-3" />{(statsData.wallet?.tier || 'standart').toUpperCase()}
                      </span>
                      <span className="text-xs text-purple-200">{statsData.wallet?.bonus_percent || 3}% bonus</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-purple-200">Jami ishlab topilgan</p>
                    <p className="text-lg font-bold">{formatPrice(statsData.wallet?.total_earned || 0)}</p>
                    <p className="text-xs text-purple-200 mt-1">Yechildi: {formatPrice(statsData.wallet?.total_withdrawn || 0)}</p>
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                  <p className="text-xs text-blue-600 font-semibold">Jami buyurtmalar</p>
                  <p className="text-2xl font-extrabold text-blue-800">{statsData.stats?.total_orders || 0}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                  <p className="text-xs text-emerald-600 font-semibold">Jami xarajat</p>
                  <p className="text-xl font-extrabold text-emerald-800">{formatPrice(statsData.stats?.total_spent || 0)}</p>
                </div>
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-3">
                  <p className="text-xs text-orange-600 font-semibold">Davr buyurtmalari</p>
                  <p className="text-2xl font-extrabold text-orange-800">{statsData.stats?.period_orders || 0}</p>
                </div>
                <div className="rounded-xl bg-purple-50 border border-purple-100 p-3">
                  <p className="text-xs text-purple-600 font-semibold">Davr bonusi</p>
                  <p className="text-xl font-extrabold text-purple-800">{formatPrice(statsData.stats?.period_bonus || 0)}</p>
                </div>
              </div>

              {/* Tier Progress */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-purple-500" />Daraja progress</p>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(statsData.tiers || {}).map(([tier, info]: [string, any]) => {
                    const isCurrent = tier === statsData.wallet?.tier
                    return (
                      <div key={tier} className={cn('rounded-xl p-2.5 text-center border-2 transition-all',
                        isCurrent ? 'border-purple-400 bg-purple-50 shadow-sm' : 'border-gray-100'
                      )}>
                        <p className={cn('text-[10px] font-bold uppercase', isCurrent ? 'text-purple-700' : 'text-gray-400')}>{tier}</p>
                        <p className="text-xs font-bold text-gray-700 mt-0.5">{info.percent}%</p>
                        <p className="text-[9px] text-gray-400">{formatPrice(info.min)}+</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Top Parts */}
              {statsData.top_parts?.length > 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-sm font-bold text-gray-900 mb-3">Eng ko'p buyurtma qilingan qismlar</p>
                  <div className="space-y-2">
                    {statsData.top_parts.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2.5">
                        <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                          i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-500'
                        )}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.quantity} dona</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{formatPrice(p.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bonus History */}
              {statsData.bonus_history?.length > 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-sm font-bold text-gray-900 mb-3">Bonus tarixi</p>
                  <div className="space-y-2">
                    {statsData.bonus_history.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5">
                        <div>
                          <p className={cn('text-sm font-bold', t.type === 'earned' ? 'text-emerald-600' : 'text-red-600')}>
                            {t.type === 'earned' ? '+' : '-'}{formatPrice(t.amount)}
                          </p>
                          <p className="text-[10px] text-gray-400">{t.note || t.type}</p>
                        </div>
                        <Badge variant={t.type === 'earned' ? 'success' : 'danger'} size="sm">{t.tier}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Order Modal */}
      <Modal open={orderOpen} onOpenChange={setOrderOpen} title="Buyurtma berish" size="lg">
        <div className="space-y-4">
          {/* Booking selection */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700 flex items-center gap-1">
              <Car className="h-4 w-4 text-blue-500" /> Qaysi mijoz uchun? (ixtiyoriy)
            </label>
            <select value={selectedBooking} onChange={e => setSelectedBooking(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Umumiy buyurtma —</option>
              {(bookings || []).map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.customer_name || 'Mijoz'} — {b.notes || 'Buyurtma'} ({fmtDate(b.scheduled_at)})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">Agar aniq mijoz uchun bo'lsa, buyurtmani tanlang</p>
          </div>

          {/* Cart items */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-2">Tanlangan mahsulotlar</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cart.map(c => (
                <div key={c.part_id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <Box className="h-4 w-4 text-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.quantity} x {formatPrice(c.price)}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 shrink-0">{formatPrice(c.price * c.quantity)}</p>
                  <button onClick={() => setCart(prev => prev.filter(x => x.part_id !== c.part_id))}
                    className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <Input label="Yetkazish manzili" value={deliveryAddr} onChange={e => setDeliveryAddr(e.target.value)}
            placeholder="Ustaxona manzili" iconLeft={<MapPin className="h-4 w-4" />} />

          {/* Total */}
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-orange-800">Jami summa:</span>
            <span className="text-xl font-extrabold text-orange-700">{formatPrice(cartTotal)}</span>
          </div>

          <Button fullWidth loading={orderMutation.isPending}
            onClick={() => orderMutation.mutate()}
            icon={<ShoppingCart className="h-4 w-4" />}
            className="bg-orange-600 hover:bg-orange-700 h-12 text-base font-bold"
          >
            Buyurtma berish
          </Button>
        </div>
      </Modal>
    </motion.div>
  )
}
