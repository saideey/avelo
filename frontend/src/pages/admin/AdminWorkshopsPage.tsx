import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Star,
  User,
  ShieldCheck,
  Ban,
  Pencil,
  Trash2,
  Upload,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  Camera,
  DollarSign,
  MessageSquare,
  CalendarCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/shared/api/axios';
import { cn, formatPrice } from '@/shared/lib/utils';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { Badge } from '@/shared/components/Badge';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Workshop {
  id: number;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  district: string;
  phone: string;
  latitude: number;
  longitude: number;
  is_verified: boolean;
  is_active: boolean;
  subscription_tier: string;
  rating_avg: number;
  total_reviews: number;
  photo_url: string | null;
  partner_name: string;
}

interface WorkshopDetail extends Workshop {
  services: { id: number; name: string; price: number; duration_minutes: number }[];
  photos: { id: number; url: string }[];
  schedule: { day_of_week: number; open_time: string; close_time: string }[];
  partner_phone: string;
  booking_count: number;
  total_revenue: number;
}

interface WorkshopsResponse {
  items: Workshop[];
  total: number;
  skip: number;
  limit: number;
}

interface RegionsResponse {
  [region: string]: {
    cities?: string[];
    districts?: string[];
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  'Urganch': [41.5513, 60.6317],
  'Xiva': [41.3783, 60.3639],
  'Toshkent': [41.2995, 69.2401],
  'Samarqand': [39.6542, 66.9597],
  'Buxoro': [39.7745, 64.4286],
  'Nukus': [42.4619, 59.6003],
};

const DAY_NAMES = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];

const PAGE_SIZE = 12;

type StatusFilter = 'all' | 'verified' | 'unverified' | 'blocked';

// ─── Leaflet Loader ─────────────────────────────────────────────────────────

function ensureLeafletLoaded(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).L) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

// ─── Leaflet Map Component ──────────────────────────────────────────────────

interface LeafletMapProps {
  lat: number;
  lng: number;
  onLocationChange?: (lat: number, lng: number) => void;
  readonly?: boolean;
  height?: number;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ lat, lng, onLocationChange, readonly = false, height = 250 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    ensureLeafletLoaded().then(() => {
      if (cancelled || !containerRef.current) return;
      const L = (window as any).L;
      if (mapRef.current) {
        mapRef.current.remove();
      }
      const map = L.map(containerRef.current).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: !readonly }).addTo(map);
      markerRef.current = marker;
      mapRef.current = map;

      if (!readonly && onLocationChange) {
        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          onLocationChange(e.latlng.lat, e.latlng.lng);
        });
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onLocationChange(pos.lat, pos.lng);
        });
      }

      setTimeout(() => map.invalidateSize(), 100);
    });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([lat, lng], 13);
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  return <div ref={containerRef} style={{ height, width: '100%' }} className="rounded-lg z-0" />;
};

// ─── Workshop Form ──────────────────────────────────────────────────────────

interface WorkshopFormData {
  name: string;
  description: string;
  region: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  partner_phone: string;
  latitude: number;
  longitude: number;
}

const defaultFormData: WorkshopFormData = {
  name: '',
  description: '',
  region: '',
  city: '',
  district: '',
  address: '',
  phone: '',
  partner_phone: '',
  latitude: 41.5513,
  longitude: 60.6317,
};

interface WorkshopFormProps {
  regions: RegionsResponse;
  initialData?: Partial<WorkshopFormData>;
  onSubmit: (data: WorkshopFormData) => void;
  loading: boolean;
  submitLabel: string;
}

const WorkshopForm: React.FC<WorkshopFormProps> = ({ regions, initialData, onSubmit, loading, submitLabel }) => {
  const [form, setForm] = useState<WorkshopFormData>({ ...defaultFormData, ...initialData });

  const regionNames = Object.keys(regions);
  const selectedRegion = regions[form.region];
  const citiesOrDistricts = selectedRegion
    ? [...(selectedRegion.cities || []), ...(selectedRegion.districts || [])]
    : [];

  const handleCityChange = (city: string) => {
    const coords = CITY_COORDS[city];
    setForm((prev) => ({
      ...prev,
      city,
      ...(coords ? { latitude: coords[0], longitude: coords[1] } : {}),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nomi"
        placeholder="Ustaxona nomi"
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        required
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Tavsif</label>
        <textarea
          className="flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
          placeholder="Qisqacha tavsif"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Viloyat</label>
          <select
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
            value={form.region}
            onChange={(e) => setForm((p) => ({ ...p, region: e.target.value, city: '', district: '' }))}
          >
            <option value="">Tanlang</option>
            {regionNames.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Shahar/Tuman</label>
          <select
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
            value={form.city || form.district}
            onChange={(e) => handleCityChange(e.target.value)}
            disabled={!form.region}
          >
            <option value="">Tanlang</option>
            {citiesOrDistricts.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <Input
        label="Manzil"
        placeholder="Ko'cha, uy raqami"
        value={form.address}
        onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Telefon"
          placeholder="+998 XX XXX XX XX"
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          required
        />
        <Input
          label="Egasi telefoni"
          placeholder="+998 XX XXX XX XX"
          value={form.partner_phone}
          onChange={(e) => setForm((p) => ({ ...p, partner_phone: e.target.value }))}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Joylashuv (xaritada bosing)</label>
        <LeafletMap
          lat={form.latitude}
          lng={form.longitude}
          onLocationChange={(lat, lng) => setForm((p) => ({ ...p, latitude: lat, longitude: lng }))}
        />
        <p className="mt-1.5 text-xs text-gray-500">
          Lat: {form.latitude.toFixed(4)}, Lng: {form.longitude.toFixed(4)}
        </p>
      </div>

      <Button type="submit" loading={loading} fullWidth className="bg-emerald-600 hover:bg-emerald-700">
        {submitLabel}
      </Button>
    </form>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

const AdminWorkshopsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editWorkshop, setEditWorkshop] = useState<Workshop | null>(null);

  // Queries
  const { data: regionsData } = useQuery<RegionsResponse>({
    queryKey: ['admin-regions'],
    queryFn: () => api.get('/admin/regions').then((r) => r.data),
    staleTime: 600_000,
  });

  const regions = regionsData || {};
  const regionNames = Object.keys(regions);
  const filteredCities = regionFilter && regions[regionFilter]
    ? [...(regions[regionFilter].cities || []), ...(regions[regionFilter].districts || [])]
    : [];

  const { data: workshopsData, isLoading: workshopsLoading } = useQuery<WorkshopsResponse>({
    queryKey: ['admin-workshops', search, regionFilter, cityFilter, statusFilter, page],
    queryFn: () =>
      api
        .get('/admin/workshops', {
          params: {
            skip: page * PAGE_SIZE,
            limit: PAGE_SIZE,
            ...(search && { search }),
            ...(cityFilter
              ? { city: cityFilter }
              : regionFilter && filteredCities.length > 0
                ? { city: filteredCities.join(',') }
                : {}),
            ...(statusFilter === 'verified' && { is_verified: true, is_active: true }),
            ...(statusFilter === 'unverified' && { is_verified: false }),
            ...(statusFilter === 'blocked' && { is_active: false }),
          },
        })
        .then((r) => r.data),
  });

  const workshops = workshopsData?.items || [];
  const total = workshopsData?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const { data: detailData, isLoading: detailLoading } = useQuery<WorkshopDetail>({
    queryKey: ['admin-workshop-detail', selectedId],
    queryFn: () => api.get(`/admin/workshops/${selectedId}/detail`).then((r) => r.data),
    enabled: !!selectedId && detailOpen,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: WorkshopFormData) =>
      api.post('/admin/workshops', {
        name: data.name,
        description: data.description,
        address: data.address,
        city: data.city,
        district: data.district,
        phone: data.phone,
        latitude: data.latitude,
        longitude: data.longitude,
        partner_phone: data.partner_phone || undefined,
      }),
    onSuccess: () => {
      toast.success("Ustaxona muvaffaqiyatli yaratildi");
      queryClient.invalidateQueries({ queryKey: ['admin-workshops'] });
      setCreateOpen(false);
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<WorkshopFormData> }) =>
      api.patch(`/admin/workshops/${id}/edit`, {
        name: data.name,
        description: data.description,
        address: data.address,
        city: data.city,
        district: data.district,
        phone: data.phone,
        latitude: data.latitude,
        longitude: data.longitude,
      }),
    onSuccess: () => {
      toast.success("Ustaxona tahrirlandi");
      queryClient.invalidateQueries({ queryKey: ['admin-workshops'] });
      queryClient.invalidateQueries({ queryKey: ['admin-workshop-detail'] });
      setEditOpen(false);
      setEditWorkshop(null);
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/workshops/${id}/verify`),
    onSuccess: () => {
      toast.success("Ustaxona tasdiqlandi");
      queryClient.invalidateQueries({ queryKey: ['admin-workshops'] });
      queryClient.invalidateQueries({ queryKey: ['admin-workshop-detail'] });
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  const blockMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/workshops/${id}/block`),
    onSuccess: () => {
      toast.success("Status o'zgartirildi");
      queryClient.invalidateQueries({ queryKey: ['admin-workshops'] });
      queryClient.invalidateQueries({ queryKey: ['admin-workshop-detail'] });
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/workshops/${id}`),
    onSuccess: () => {
      toast.success("Ustaxona o'chirildi");
      queryClient.invalidateQueries({ queryKey: ['admin-workshops'] });
      setDeleteOpen(false);
      setDetailOpen(false);
      setSelectedId(null);
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  const photoUploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api.post(`/admin/workshops/${id}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success("Rasm yuklandi");
      queryClient.invalidateQueries({ queryKey: ['admin-workshop-detail'] });
    },
    onError: () => toast.error("Rasm yuklashda xatolik"),
  });

  const photoDeleteMutation = useMutation({
    mutationFn: ({ workshopId, photoId }: { workshopId: number; photoId: number }) =>
      api.delete(`/admin/workshops/${workshopId}/photos/${photoId}`),
    onSuccess: () => {
      toast.success("Rasm o'chirildi");
      queryClient.invalidateQueries({ queryKey: ['admin-workshop-detail'] });
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  // Handlers
  const openDetail = (id: number) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const openEdit = (w: Workshop) => {
    setEditWorkshop(w);
    setEditOpen(true);
  };

  const openDelete = (id: number) => {
    setSelectedId(id);
    setDeleteOpen(true);
  };

  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && selectedId) {
        photoUploadMutation.mutate({ id: selectedId, file });
      }
      e.target.value = '';
    },
    [selectedId]
  );

  const getStatusBorder = (w: Workshop) => {
    if (!w.is_active) return 'border-red-400';
    if (!w.is_verified) return 'border-yellow-400';
    return 'border-emerald-400';
  };

  const statusChips: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Barchasi' },
    { key: 'verified', label: 'Tasdiqlangan' },
    { key: 'unverified', label: 'Tasdiqlanmagan' },
    { key: 'blocked', label: 'Bloklangan' },
  ];

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [search, regionFilter, cityFilter, statusFilter]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ustaxonalar</h1>
            <p className="text-sm text-gray-500">{total} ta ustaxona</p>
          </div>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          icon={<Plus className="h-4 w-4" />}
          className="bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500"
        >
          Yangi ustaxona
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            iconLeft={<Search className="h-4 w-4" />}
          />
        </div>
        <select
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400"
          value={regionFilter}
          onChange={(e) => {
            setRegionFilter(e.target.value);
            setCityFilter('');
          }}
        >
          <option value="">Barcha viloyatlar</option>
          {regionNames.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          disabled={!regionFilter}
        >
          <option value="">Barcha shaharlar</option>
          {filteredCities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex gap-1.5 flex-wrap">
          {statusChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setStatusFilter(chip.key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                statusFilter === chip.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {workshopsLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" label="Yuklanmoqda..." />
        </div>
      ) : workshops.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="Ustaxonalar topilmadi"
          description="Filtrlarni o'zgartiring yoki yangi ustaxona yarating"
          actionLabel="Yangi ustaxona"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <>
          {/* Cards Grid */}
          <motion.div
            className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            <AnimatePresence mode="popLayout">
              {workshops.map((w) => (
                <motion.div
                  key={w.id}
                  layout
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={cn(
                    'group cursor-pointer overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-shadow hover:shadow-xl',
                    getStatusBorder(w)
                  )}
                  onClick={() => openDetail(w.id)}
                >
                  {/* Photo */}
                  <div className="relative h-40 overflow-hidden">
                    {w.photo_url ? (
                      <img
                        src={w.photo_url}
                        alt={w.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                        <MapPin className="h-12 w-12 text-slate-400" />
                      </div>
                    )}
                    {/* Overlays */}
                    <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                      {w.is_verified && (
                        <Badge variant="success" size="sm" className="flex items-center gap-1 shadow-sm">
                          <ShieldCheck className="h-3 w-3" /> Tasdiqlangan
                        </Badge>
                      )}
                      {w.subscription_tier && w.subscription_tier !== 'free' && (
                        <Badge variant="primary" size="sm" className="shadow-sm capitalize">
                          {w.subscription_tier}
                        </Badge>
                      )}
                    </div>
                    <div className="absolute right-2 top-2">
                      {!w.is_active ? (
                        <Badge variant="danger" size="sm" className="shadow-sm">Bloklangan</Badge>
                      ) : !w.is_verified ? (
                        <Badge variant="warning" size="sm" className="shadow-sm">Kutilmoqda</Badge>
                      ) : null}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="truncate text-base font-bold text-gray-900">{w.name}</h3>
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{[w.city, w.district].filter(Boolean).join(', ')}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-gray-700">{(w.rating_avg || 0).toFixed(1)}</span>
                      <span className="text-gray-400">({w.total_reviews || 0} sharh)</span>
                    </div>
                    {w.partner_name && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{w.partner_name}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-1.5 border-t border-gray-100 pt-3">
                      {!w.is_verified && (
                        <button
                          onClick={(e) => { e.stopPropagation(); verifyMutation.mutate(w.id); }}
                          className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50"
                          title="Tasdiqlash"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); blockMutation.mutate(w.id); }}
                        className={cn(
                          'rounded-lg p-1.5 transition-colors',
                          w.is_active
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        )}
                        title={w.is_active ? 'Bloklash' : 'Blokdan chiqarish'}
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(w); }}
                        className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50"
                        title="Tahrirlash"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openDelete(w.id); }}
                        className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50"
                        title="O'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={cn(
                    'h-9 w-9 rounded-lg text-sm font-medium transition-all',
                    page === i
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ─── Create Modal ──────────────────────────────────────────────── */}
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Yangi ustaxona"
        size="lg"
        className="max-h-[90vh] overflow-y-auto"
      >
        <WorkshopForm
          regions={regions}
          onSubmit={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
          submitLabel="Yaratish"
        />
      </Modal>

      {/* ─── Edit Modal ────────────────────────────────────────────────── */}
      <Modal
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditWorkshop(null);
        }}
        title="Ustaxonani tahrirlash"
        size="lg"
        className="max-h-[90vh] overflow-y-auto"
      >
        {editWorkshop && (
          <WorkshopForm
            regions={regions}
            initialData={{
              name: editWorkshop.name,
              description: editWorkshop.description,
              address: editWorkshop.address,
              city: editWorkshop.city,
              district: editWorkshop.district,
              phone: editWorkshop.phone,
              latitude: editWorkshop.latitude,
              longitude: editWorkshop.longitude,
            }}
            onSubmit={(data) => editMutation.mutate({ id: editWorkshop.id, data })}
            loading={editMutation.isPending}
            submitLabel="Saqlash"
          />
        )}
      </Modal>

      {/* ─── Detail Modal ──────────────────────────────────────────────── */}
      <Modal
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedId(null);
        }}
        title={detailData?.name || 'Ustaxona'}
        size="lg"
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" label="Ma'lumotlar yuklanmoqda..." />
          </div>
        ) : detailData ? (
          <div className="space-y-6">
            {/* Photos */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">Rasmlar</h4>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100">
                    <Upload className="h-3.5 w-3.5" /> Yuklash
                  </span>
                </label>
              </div>
              {detailData.photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {detailData.photos.map((photo) => (
                    <div key={photo.id} className="group/photo relative aspect-square overflow-hidden rounded-lg">
                      <img src={photo.url} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => photoDeleteMutation.mutate({ workshopId: detailData.id, photoId: photo.id })}
                        className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover/photo:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400">
                  <Camera className="mr-2 h-4 w-4" /> Rasmlar yo'q
                </div>
              )}
            </div>

            {/* Name + Status */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900">{detailData.name}</h3>
              {detailData.is_verified && (
                <Badge variant="success" className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Tasdiqlangan
                </Badge>
              )}
              {!detailData.is_active && (
                <Badge variant="danger">Bloklangan</Badge>
              )}
            </div>

            {/* Description */}
            {detailData.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{detailData.description}</p>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Shahar</p>
                <p className="text-sm font-medium text-gray-900">{[detailData.city, detailData.district].filter(Boolean).join(', ') || '—'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Manzil</p>
                <p className="text-sm font-medium text-gray-900">{detailData.address || '—'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Telefon</p>
                <p className="text-sm font-medium text-gray-900">{detailData.phone || '—'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Egasi</p>
                <p className="text-sm font-medium text-gray-900">{detailData.partner_name || '—'}</p>
                {detailData.partner_phone && (
                  <p className="text-xs text-gray-500">{detailData.partner_phone}</p>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: CalendarCheck, label: 'Buyurtmalar', value: detailData.booking_count || 0, color: 'text-blue-600 bg-blue-50' },
                { icon: DollarSign, label: 'Daromad', value: formatPrice(detailData.total_revenue || 0), color: 'text-emerald-600 bg-emerald-50' },
                { icon: Star, label: 'Reyting', value: (detailData.rating_avg || 0).toFixed(1), color: 'text-amber-600 bg-amber-50' },
                { icon: MessageSquare, label: 'Sharhlar', value: detailData.total_reviews || 0, color: 'text-purple-600 bg-purple-50' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-gray-100 bg-white p-3 text-center shadow-sm">
                  <div className={cn('mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-lg', stat.color)}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Map */}
            {detailData.latitude && detailData.longitude && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700">Joylashuv</h4>
                <LeafletMap lat={detailData.latitude} lng={detailData.longitude} readonly height={200} />
              </div>
            )}

            {/* Services */}
            {detailData.services.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700">Xizmatlar</h4>
                <div className="space-y-2">
                  {detailData.services.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.duration_minutes} daqiqa</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">{formatPrice(s.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule */}
            {detailData.schedule.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700">Ish vaqti</h4>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <tbody>
                      {detailData.schedule.map((s) => (
                        <tr key={s.day_of_week} className="border-b border-gray-100 last:border-0">
                          <td className="px-3 py-2 font-medium text-gray-700">{DAY_NAMES[s.day_of_week] || `Kun ${s.day_of_week}`}</td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            <Clock className="mr-1 inline h-3.5 w-3.5" />
                            {s.open_time} — {s.close_time}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              {!detailData.is_verified && (
                <Button
                  onClick={() => verifyMutation.mutate(detailData.id)}
                  loading={verifyMutation.isPending}
                  icon={<ShieldCheck className="h-4 w-4" />}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  size="sm"
                >
                  Tasdiqlash
                </Button>
              )}
              <Button
                onClick={() => blockMutation.mutate(detailData.id)}
                loading={blockMutation.isPending}
                variant={detailData.is_active ? 'outline' : 'primary'}
                icon={<Ban className="h-4 w-4" />}
                size="sm"
              >
                {detailData.is_active ? 'Bloklash' : 'Blokdan chiqarish'}
              </Button>
              <Button
                onClick={() => {
                  setDetailOpen(false);
                  openEdit(detailData);
                }}
                variant="outline"
                icon={<Pencil className="h-4 w-4" />}
                size="sm"
              >
                Tahrirlash
              </Button>
              <Button
                onClick={() => {
                  setDetailOpen(false);
                  openDelete(detailData.id);
                }}
                variant="danger"
                icon={<Trash2 className="h-4 w-4" />}
                size="sm"
              >
                O'chirish
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ─── Delete Confirmation ───────────────────────────────────────── */}
      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Ustaxonani o'chirish"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Haqiqatan ham bu ustaxonani o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)} size="sm">
            Bekor qilish
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => selectedId && deleteMutation.mutate(selectedId)}
            size="sm"
          >
            O'chirish
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminWorkshopsPage;
