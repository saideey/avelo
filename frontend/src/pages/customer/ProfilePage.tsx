import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Camera, Phone, Mail, Car, Plus, LogOut, Globe, ChevronRight,
  Shield, Wallet, Heart, MessageSquareWarning, Trash2, Edit3,
  Calendar, Gauge, Palette,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/app/hooks'
import { useAuth } from '@/shared/hooks/useAuth'
import { Avatar } from '@/shared/components/Avatar'
import { Input } from '@/shared/components/Input'
import { Button } from '@/shared/components/Button'
import { Modal } from '@/shared/components/Modal'
import { Badge } from '@/shared/components/Badge'
import { EmptyState } from '@/shared/components/EmptyState'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { formatPhone, cn } from '@/shared/lib/utils'
import api from '@/shared/api/axios'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user = useAppSelector(s => s.auth.user)
  const { logout, fetchUser } = useAuth()
  const qc = useQueryClient()

  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Avatar upload
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('avatar', file)
      const { data } = await api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      return data
    },
    onSuccess: () => {
      toast.success('Rasm yuklandi')
      qc.invalidateQueries({ queryKey: ['user'] })
      fetchUser()
    },
    onError: () => toast.error('Rasm yuklashda xatolik'),
  })

  // State
  const [editOpen, setEditOpen] = useState(false)
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [name, setName] = useState(user?.full_name || '')
  const [email, setEmail] = useState('')

  // Vehicle form
  const [vBrandId, setVBrandId] = useState('')
  const [vModelId, setVModelId] = useState('')
  const [vYear, setVYear] = useState('')
  const [vPlate, setVPlate] = useState('')
  const [vColor, setVColor] = useState('')

  // Queries
  const { data: vehicles } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: () => api.get('/users/me/vehicles').then(r => r.data).catch(() => []),
  })

  const { data: brands } = useQuery({
    queryKey: ['vehicle-brands'],
    queryFn: () => api.get('/users/vehicle-brands').then(r => r.data).catch(() => []),
    enabled: vehicleOpen,
  })

  const { data: complaints } = useQuery({
    queryKey: ['my-complaints-count'],
    queryFn: () => api.get('/users/me/complaints', { params: { limit: 1 } }).then(r => r.data).catch(() => ({ items: [] })),
  })

  const { data: warranties } = useQuery({
    queryKey: ['my-warranties-count'],
    queryFn: () => api.get('/users/me/warranties').then(r => Array.isArray(r.data) ? r.data : []).catch(() => []),
  })

  const { data: favorites } = useQuery({
    queryKey: ['my-favorites-count'],
    queryFn: () => api.get('/users/me/favorites').then(r => r.data).catch(() => ({ items: [] })),
  })

  // Mutations
  const updateProfile = useMutation({
    mutationFn: (p: any) => api.patch('/users/me', p),
    onSuccess: () => { toast.success('Profil yangilandi'); setEditOpen(false); qc.invalidateQueries({ queryKey: ['user'] }) },
    onError: () => toast.error('Xatolik'),
  })

  const addVehicle = useMutation({
    mutationFn: (p: any) => api.post('/users/me/vehicles', p),
    onSuccess: () => {
      toast.success('Mashina qo\'shildi')
      setVehicleOpen(false)
      resetVehicleForm()
      qc.invalidateQueries({ queryKey: ['my-vehicles'] })
    },
    onError: () => toast.error('Xatolik'),
  })

  const deleteVehicle = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/vehicles/${id}`),
    onSuccess: () => { toast.success('Mashina o\'chirildi'); qc.invalidateQueries({ queryKey: ['my-vehicles'] }) },
    onError: () => toast.error('Xatolik'),
  })

  const resetVehicleForm = () => { setVBrandId(''); setVModelId(''); setVYear(''); setVPlate(''); setVColor('') }

  const vehicleList = Array.isArray(vehicles) ? vehicles : []
  const selectedBrand = (brands || []).find((b: any) => b.id === vBrandId)
  const complaintCount = complaints?.items?.length || complaints?.total || 0
  const warrantyCount = warranties?.length || 0
  const favoriteCount = favorites?.items?.length || favorites?.total || 0

  const menuItems = [
    { icon: Wallet, label: 'Cashback', desc: 'Balans va tier', color: 'text-blue-600 bg-blue-50', to: '/cashback' },
    { icon: Shield, label: 'Kafolatlar', desc: `${warrantyCount} ta faol`, color: 'text-emerald-600 bg-emerald-50', to: '/warranties', badge: warrantyCount },
    { icon: Heart, label: 'Sevimli ustaxonalar', desc: `${favoriteCount} ta saqlangan`, color: 'text-red-600 bg-red-50', to: '/favorites', badge: favoriteCount },
    { icon: MessageSquareWarning, label: 'Shikoyatlarim', desc: 'Yuborish va kuzatish', color: 'text-orange-600 bg-orange-50', to: '/complaints', badge: complaintCount },
    { icon: Globe, label: i18n.language === 'uz' ? "O'zbekcha" : 'Русский', desc: 'Tilni o\'zgartirish', color: 'text-purple-600 bg-purple-50', action: () => {
      const next = i18n.language === 'uz' ? 'ru' : 'uz'
      i18n.changeLanguage(next)
      localStorage.setItem('lang', next)
      toast.success(next === 'uz' ? "O'zbek tiliga o'tdi" : 'Переключено на русский')
    }},
  ]

  return (
    <motion.div className="mx-auto max-w-lg px-4 py-6 space-y-6" variants={stagger} initial="hidden" animate="show">
      {/* Avatar + Info */}
      <motion.div variants={fadeUp} className="flex flex-col items-center">
        <div className="relative">
          <Avatar src={user?.avatar_url} name={user?.full_name || ''} size="xl" />
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar.mutate(f); if (avatarInputRef.current) avatarInputRef.current.value = '' }}
          />
          <button onClick={() => avatarInputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
          >
            {uploadAvatar.isPending ? <LoadingSpinner size="sm" /> : <Camera className="h-4 w-4" />}
          </button>
        </div>
        <h2 className="mt-3 text-xl font-extrabold text-gray-900">{user?.full_name || 'Foydalanuvchi'}</h2>
        <p className="text-sm text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" />{formatPhone(user?.phone || '')}</p>
        <button onClick={() => setEditOpen(true)}
          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Profilni tahrirlash
        </button>
      </motion.div>

      {/* Menu Items */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden divide-y divide-gray-50">
        {menuItems.map(item => (
          <button key={item.label}
            onClick={() => item.to ? navigate(item.to) : item.action?.()}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
          >
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', item.color)}>
              <item.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="text-[11px] text-gray-400">{item.desc}</p>
            </div>
            {item.badge ? <Badge variant="primary" size="sm">{item.badge}</Badge> : null}
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </button>
        ))}
      </motion.div>

      {/* Vehicles */}
      <motion.div variants={fadeUp}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Car className="h-5 w-5 text-gray-400" /> Mashinalarim
          </h3>
          <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />}
            onClick={() => setVehicleOpen(true)}
          >
            Qo'shish
          </Button>
        </div>

        {vehicleList.length > 0 ? (
          <div className="space-y-2">
            {vehicleList.map((v: any) => (
              <motion.div key={v.id} variants={fadeUp}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <Car className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{v.brand_name} {v.model_name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{v.year}</span>
                    {v.license_plate && <span className="font-mono font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{v.license_plate}</span>}
                    {v.color && <span className="flex items-center gap-1"><Palette className="h-3 w-3" />{v.color}</span>}
                    {v.mileage && <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{(v.mileage / 1000).toFixed(0)}K km</span>}
                  </div>
                </div>
                <button onClick={() => deleteVehicle.mutate(v.id)}
                  className="rounded-lg p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
            <Car className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">Hali mashina qo'shilmagan</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setVehicleOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Mashina qo'shish
            </Button>
          </div>
        )}
      </motion.div>

      {/* Logout */}
      <motion.div variants={fadeUp}>
        <Button variant="danger" fullWidth icon={<LogOut className="h-4 w-4" />} onClick={() => setLogoutOpen(true)}>
          {t('auth.logout')}
        </Button>
      </motion.div>

      {/* Edit Profile Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title="Profilni tahrirlash">
        <div className="space-y-4">
          <Input label={t('auth.fullName')} value={name} onChange={e => setName(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" iconLeft={<Mail className="h-4 w-4" />} />
          <Button fullWidth loading={updateProfile.isPending}
            onClick={() => updateProfile.mutate({ full_name: name, email: email || undefined })}
          >
            {t('common.save')}
          </Button>
        </div>
      </Modal>

      {/* Add Vehicle Modal */}
      <Modal open={vehicleOpen} onOpenChange={(v) => { setVehicleOpen(v); if (!v) resetVehicleForm() }} title="Mashina qo'shish" size="md">
        <div className="space-y-4">
          {/* Brand Select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Marka</label>
            <select value={vBrandId} onChange={e => { setVBrandId(e.target.value); setVModelId('') }}
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Markani tanlang</option>
              {(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Model Select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Model</label>
            <select value={vModelId} onChange={e => setVModelId(e.target.value)}
              disabled={!vBrandId}
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Modelni tanlang</option>
              {(selectedBrand?.models || []).map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.year_from}+)</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Yil" type="number" placeholder="2020" value={vYear} onChange={e => setVYear(e.target.value)} />
            <Input label="Davlat raqami" placeholder="01A777AA" value={vPlate} onChange={e => setVPlate(e.target.value.toUpperCase())} />
          </div>

          <Input label="Rang" placeholder="Oq" value={vColor} onChange={e => setVColor(e.target.value)} />

          <Button fullWidth loading={addVehicle.isPending}
            disabled={!vBrandId || !vModelId || !vYear}
            onClick={() => addVehicle.mutate({
              brand_id: vBrandId,
              model_id: vModelId,
              year: parseInt(vYear),
              license_plate: vPlate || undefined,
              color: vColor || undefined,
            })}
          >
            <Plus className="h-4 w-4 mr-1" /> Qo'shish
          </Button>
        </div>
      </Modal>

      {/* Logout Confirm */}
      <Modal open={logoutOpen} onOpenChange={setLogoutOpen} title="Chiqish" size="sm">
        <p className="text-sm text-gray-600">Haqiqatan ham chiqmoqchimisiz?</p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setLogoutOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="danger" className="flex-1" onClick={logout}>{t('auth.logout')}</Button>
        </div>
      </Modal>
    </motion.div>
  )
}
