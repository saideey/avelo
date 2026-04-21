import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Package, Plus, Search, Edit2, Trash2, Tag, Box,
  DollarSign, Archive, ChevronRight, ChevronLeft, X, Car, Upload, Image,
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

const PAGE_SIZE = 20
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

export default function AdminPartsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editPart, setEditPart] = useState<any>(null)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [carModalOpen, setCarModalOpen] = useState(false)
  const [newCarBrand, setNewCarBrand] = useState('')
  const [newCarName, setNewCarName] = useState('')
  const [newCarYear, setNewCarYear] = useState('')
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandCountry, setNewBrandCountry] = useState('')

  const [vehicleFilter, setVehicleFilter] = useState('')

  // Form state
  const [form, setForm] = useState({ name: '', sku: '', category_id: '', description: '', price_retail: '', price_wholesale: '', quantity: '', vehicle_model_ids: [] as string[] })
  const resetForm = () => setForm({ name: '', sku: '', category_id: '', description: '', price_retail: '', price_wholesale: '', quantity: '', vehicle_model_ids: [] })

  // Queries
  const { data: categories } = useQuery({
    queryKey: ['admin-part-cats'],
    queryFn: () => api.get('/admin/parts/categories').then(r => r.data).catch(() => []),
  })

  const { data: vehicleBrands } = useQuery({
    queryKey: ['admin-vehicle-brands'],
    queryFn: () => api.get('/users/vehicle-brands').then(r => Array.isArray(r.data) ? r.data : []).catch(() => []),
  })

  const allModels = (vehicleBrands || []).flatMap((b: any) => (b.models || []).map((m: any) => ({ ...m, brand_name: b.name })))

  const { data, isLoading } = useQuery({
    queryKey: ['admin-parts', search, catFilter, vehicleFilter, page],
    queryFn: () => {
      const p: Record<string, string | number> = { skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }
      if (search) p.search = search
      if (catFilter) p.category_id = catFilter
      if (vehicleFilter) p.vehicle_model_id = vehicleFilter
      return api.get('/admin/parts', { params: p }).then(r => r.data).catch(() => ({ items: [], total: 0 }))
    },
  })

  const items = data?.items || []
  const total = data?.total || 0
  const pages = Math.ceil(total / PAGE_SIZE)
  const cats = Array.isArray(categories) ? categories : []

  // Mutations
  const createPart = useMutation({
    mutationFn: () => api.post('/admin/parts', {
      ...form, price_retail: Number(form.price_retail) || 0,
      price_wholesale: form.price_wholesale ? Number(form.price_wholesale) : null,
      quantity: Number(form.quantity) || 0, category_id: form.category_id || null,
    }),
    onSuccess: () => { toast.success('Mahsulot yaratildi'); setCreateOpen(false); resetForm(); qc.invalidateQueries({ queryKey: ['admin-parts'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail?.message || 'Xatolik'),
  })

  const updatePart = useMutation({
    mutationFn: () => api.patch(`/admin/parts/${editPart.id}`, {
      ...form, price_retail: Number(form.price_retail) || undefined,
      price_wholesale: form.price_wholesale ? Number(form.price_wholesale) : undefined,
      quantity: form.quantity ? Number(form.quantity) : undefined,
      category_id: form.category_id || undefined,
    }),
    onSuccess: () => { toast.success('Yangilandi'); setEditPart(null); resetForm(); qc.invalidateQueries({ queryKey: ['admin-parts'] }) },
    onError: () => toast.error('Xatolik'),
  })

  const deletePart = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/parts/${id}`),
    onSuccess: () => { toast.success("O'chirildi"); qc.invalidateQueries({ queryKey: ['admin-parts'] }) },
    onError: () => toast.error('Xatolik'),
  })

  const createCat = useMutation({
    mutationFn: () => api.post('/admin/parts/categories', { name: newCatName }),
    onSuccess: () => { toast.success('Kategoriya yaratildi'); setNewCatName(''); qc.invalidateQueries({ queryKey: ['admin-part-cats'] }) },
    onError: () => toast.error('Xatolik'),
  })

  const deleteCat = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/parts/categories/${id}`),
    onSuccess: () => { toast.success("Kategoriya o'chirildi"); qc.invalidateQueries({ queryKey: ['admin-part-cats'] }) },
    onError: () => toast.error('Xatolik'),
  })

  const createCar = useMutation({
    mutationFn: () => api.post('/admin/vehicle-models', { brand_id: newCarBrand, name: newCarName, year_from: newCarYear ? Number(newCarYear) : null }),
    onSuccess: () => { toast.success('Moshina yaratildi'); setNewCarName(''); setNewCarYear(''); qc.invalidateQueries({ queryKey: ['admin-vehicle-brands'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail?.message || 'Xatolik'),
  })

  const uploadCarImage = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData(); fd.append('image', file)
      return api.post(`/admin/vehicle-models/${id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => { toast.success('Rasm yuklandi'); qc.invalidateQueries({ queryKey: ['admin-vehicle-brands'] }) },
    onError: () => toast.error('Rasm yuklashda xatolik'),
  })

  const createBrand = useMutation({
    mutationFn: () => api.post('/admin/vehicle-brands', { name: newBrandName, country: newBrandCountry }),
    onSuccess: () => { toast.success('Marka yaratildi'); setNewBrandName(''); setNewBrandCountry(''); qc.invalidateQueries({ queryKey: ['admin-vehicle-brands'] }) },
    onError: () => toast.error('Xatolik'),
  })

  const deleteCar = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/vehicle-models/${id}`),
    onSuccess: () => { toast.success("Moshina o'chirildi"); qc.invalidateQueries({ queryKey: ['admin-vehicle-brands'] }) },
    onError: () => toast.error('Xatolik'),
  })

  const openEdit = (p: any) => {
    setEditPart(p)
    setForm({ name: p.name, sku: p.sku, category_id: p.category_id || '', description: p.description || '', price_retail: String(p.price || 0), price_wholesale: p.price_wholesale ? String(p.price_wholesale) : '', quantity: String(p.quantity || 0), vehicle_model_ids: (p.vehicles || []).map((v: any) => v.id) })
  }

  return (
    <motion.div className="space-y-6 p-4 md:p-6" variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-200">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Ehtiyot Qismlar</h1>
            <p className="text-sm text-gray-500">{total} ta mahsulot · {cats.length} ta kategoriya</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCarModalOpen(true)} icon={<Car className="h-4 w-4" />}>Moshinalar</Button>
          <Button variant="outline" size="sm" onClick={() => setCatModalOpen(true)} icon={<Tag className="h-4 w-4" />}>Kategoriyalar</Button>
          <Button onClick={() => { resetForm(); setCreateOpen(true) }} icon={<Plus className="h-4 w-4" />} className="bg-emerald-600 hover:bg-emerald-700">Yangi mahsulot</Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 max-w-xs">
          <Input placeholder="Nomi yoki SKU..." iconLeft={<Search className="h-4 w-4" />} value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select value={vehicleFilter} onChange={e => { setVehicleFilter(e.target.value); setPage(1) }}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">🚗 Barcha moshinalar</option>
          {allModels.map((m: any) => <option key={m.id} value={m.id}>{m.brand_name} {m.name}</option>)}
        </select>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button onClick={() => { setCatFilter(''); setPage(1) }}
            className={cn('shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all',
              !catFilter ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}>Barchasi</button>
          {cats.map((c: any) => (
            <button key={c.id} onClick={() => { setCatFilter(c.id); setPage(1) }}
              className={cn('shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all',
                catFilter === c.id ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              )}>{c.name}</button>
          ))}
        </div>
      </motion.div>

      {/* Parts Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>
      ) : !items.length ? (
        <EmptyState icon={<Package className="h-8 w-8" />} title="Mahsulotlar topilmadi" actionLabel="Mahsulot qo'shish" onAction={() => { resetForm(); setCreateOpen(true) }} />
      ) : (
        <motion.div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" variants={stagger}>
          {items.map((p: any) => (
            <motion.div key={p.id} variants={fadeUp}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
                    <Box className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{p.name}</p>
                    <p className="text-[10px] font-mono text-gray-400">{p.sku}</p>
                  </div>
                </div>
                <Badge variant={p.is_active ? 'success' : 'danger'} size="sm">{p.is_active ? 'Faol' : 'Nofaol'}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-lg bg-gray-50 p-2">
                  <p className="text-[10px] text-gray-400 uppercase">Kategoriya</p>
                  <p className="text-xs font-semibold text-gray-700 truncate">{p.category || '—'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <p className="text-[10px] text-gray-400 uppercase">Brend</p>
                  <p className="text-xs font-semibold text-gray-700 truncate">{p.brand || '—'}</p>
                </div>
              </div>
              {p.vehicles && p.vehicles.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {p.vehicles.map((v: any) => (
                    <span key={v.id} className="text-[9px] bg-blue-50 text-blue-600 font-medium px-1.5 py-0.5 rounded-full">🚗 {v.name}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-base font-extrabold text-gray-900">{formatPrice(p.price || 0)}</p>
                  {p.price_wholesale && <p className="text-[10px] text-gray-400">Optom: {formatPrice(p.price_wholesale)}</p>}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Archive className="h-3 w-3 text-gray-400" />
                  <span className={cn('font-bold', p.quantity > 0 ? 'text-emerald-600' : 'text-red-500')}>{p.quantity} dona</span>
                </div>
              </div>

              <div className="flex gap-1.5 pt-2 border-t border-gray-50">
                <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-blue-50 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors">
                  <Edit2 className="h-3 w-3" /> Tahrirlash
                </button>
                <button onClick={() => { if (confirm("O'chirishni tasdiqlaysizmi?")) deletePart.mutate(p.id) }}
                  className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-2 text-red-500 hover:bg-red-100 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
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

      {/* Create/Edit Modal */}
      <Modal open={createOpen || !!editPart} onOpenChange={v => { if (!v) { setCreateOpen(false); setEditPart(null); resetForm() } }}
        title={editPart ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'} size="md"
      >
        <div className="space-y-4">
          <Input label="Nomi" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Castrol Edge 5W-30" />
          <Input label="SKU (artikul)" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))} placeholder="MOY-001" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Kategoriya</label>
            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Kategoriyasiz</option>
              {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {/* Vehicle models */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Moshinalar (qaysi moshinaga mos)</label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border border-gray-300 bg-white min-h-[42px]">
              {allModels.map((m: any) => {
                const selected = form.vehicle_model_ids.includes(m.id)
                return (
                  <button key={m.id} type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      vehicle_model_ids: selected
                        ? f.vehicle_model_ids.filter(id => id !== m.id)
                        : [...f.vehicle_model_ids, m.id]
                    }))}
                    className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all border',
                      selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    )}
                  >
                    {selected ? '✓ ' : ''}{m.brand_name} {m.name}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Bir yoki bir nechta moshinani tanlang</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Tavsif</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Mahsulot haqida..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Chakana narx" type="number" value={form.price_retail} onChange={e => setForm(f => ({ ...f, price_retail: e.target.value }))} placeholder="185000" />
            <Input label="Optom narx" type="number" value={form.price_wholesale} onChange={e => setForm(f => ({ ...f, price_wholesale: e.target.value }))} placeholder="160000" />
            <Input label="Soni" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="25" />
          </div>
          <Button fullWidth loading={createPart.isPending || updatePart.isPending}
            disabled={!form.name || !form.sku}
            onClick={() => editPart ? updatePart.mutate() : createPart.mutate()}
            icon={editPart ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {editPart ? 'Saqlash' : 'Yaratish'}
          </Button>
        </div>
      </Modal>

      {/* Categories Modal */}
      <Modal open={catModalOpen} onOpenChange={setCatModalOpen} title="Kategoriyalar boshqaruvi" size="md">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Yangi kategoriya nomi..." value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1" />
            <Button onClick={() => newCatName && createCat.mutate()} loading={createCat.isPending} disabled={!newCatName}
              icon={<Plus className="h-4 w-4" />} className="bg-emerald-600 hover:bg-emerald-700">Qo'shish</Button>
          </div>
          <div className="space-y-2">
            {cats.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-semibold text-gray-900">{c.name}</span>
                  <span className="text-[10px] font-mono text-gray-400">{c.slug}</span>
                </div>
                <button onClick={() => deleteCat.mutate(c.id)} className="rounded-lg p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!cats.length && <p className="text-center text-sm text-gray-400 py-4">Kategoriyalar yo'q</p>}
          </div>
        </div>
      </Modal>

      {/* Cars Modal */}
      <Modal open={carModalOpen} onOpenChange={setCarModalOpen} title="Moshinalar boshqaruvi" size="lg">
        <div className="space-y-4">
          {/* Create brand */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-2">
            <p className="text-sm font-bold text-emerald-900">Yangi marka yaratish</p>
            <div className="flex gap-2">
              <Input placeholder="Marka nomi (masalan: BYD)" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} className="flex-1" />
              <Input placeholder="Mamlakat" value={newBrandCountry} onChange={e => setNewBrandCountry(e.target.value)} className="w-32" />
              <Button onClick={() => newBrandName && createBrand.mutate()} loading={createBrand.isPending}
                disabled={!newBrandName} icon={<Plus className="h-4 w-4" />}
                className="bg-emerald-600 hover:bg-emerald-700">Yaratish</Button>
            </div>
          </div>

          {/* Create model */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-2">
            <p className="text-sm font-bold text-blue-900">Yangi model qo'shish</p>
            <div className="flex gap-2 flex-wrap">
              <select value={newCarBrand} onChange={e => setNewCarBrand(e.target.value)}
                className="h-10 flex-1 min-w-[140px] rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Marka tanlang</option>
                {(vehicleBrands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <Input placeholder="Model nomi" value={newCarName} onChange={e => setNewCarName(e.target.value)} className="flex-1 min-w-[120px]" />
              <Input placeholder="Yil" type="number" value={newCarYear} onChange={e => setNewCarYear(e.target.value)} className="w-20" />
              <Button onClick={() => newCarBrand && newCarName && createCar.mutate()} loading={createCar.isPending}
                disabled={!newCarBrand || !newCarName} icon={<Plus className="h-4 w-4" />}
                className="bg-blue-600 hover:bg-blue-700">Qo'shish</Button>
            </div>
          </div>

          {/* Models list */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(vehicleBrands || []).map((brand: any) => (
              <div key={brand.id}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{brand.name}</p>
                <div className="space-y-1.5 mb-3">
                  {(brand.models || []).map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 hover:shadow-sm transition-all">
                      {/* Image */}
                      <div className="h-14 w-20 shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        {m.image_url ? (
                          <img src={m.image_url} alt={m.name} className="h-full w-full object-cover" />
                        ) : (
                          <Car className="h-6 w-6 text-gray-300" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{brand.name} {m.name}</p>
                        <p className="text-xs text-gray-400">{m.year_from ? `${m.year_from}+` : ''}</p>
                      </div>
                      {/* Upload image */}
                      <label className="cursor-pointer rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 transition-colors">
                        <Upload className="h-4 w-4" />
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadCarImage.mutate({ id: m.id, file: f }); e.target.value = '' }} />
                      </label>
                      {/* Delete */}
                      <button onClick={() => { if (confirm(`${m.name} ni o'chirishni tasdiqlaysizmi?`)) deleteCar.mutate(m.id) }}
                        className="rounded-lg p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {(!brand.models || !brand.models.length) && <p className="text-xs text-gray-400 pl-2">Modellar yo'q</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
