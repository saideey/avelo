import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Settings,
  Clock,
  Wrench,
  Image as ImageIcon,
  Save,
  Plus,
  Trash2,
  Edit3,
  Upload,
  X,
} from 'lucide-react';
import api from '@/shared/api/axios';
import { cn, formatPrice } from '@/shared/lib/utils';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';
import { toast } from 'sonner';

interface WorkshopInfo {
  name: string;
  description: string;
  address: string;
  phone: string;
  city: string;
}

interface WorkSchedule {
  day_of_week: number;
  day_label: string;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface WorkshopService {
  id: string;
  name: string;
  price_from: number;
  price_to: number;
  duration: number;
}

interface WorkshopPhoto {
  id: string;
  url: string;
  order?: number;
}

interface SettingsData {
  info: WorkshopInfo;
  schedule: WorkSchedule[];
  services: WorkshopService[];
  photos: WorkshopPhoto[];
}

const tabs = [
  { key: 'general', label: 'Umumiy', icon: Settings },
  { key: 'schedule', label: 'Ish grafigi', icon: Clock },
  { key: 'services', label: 'Xizmatlar', icon: Wrench },
  { key: 'photos', label: 'Rasmlar', icon: ImageIcon },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const PartnerSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  const { data, isLoading } = useQuery<SettingsData>({
    queryKey: ['partner-settings'],
    queryFn: async () => {
      const { data } = await api.get('/partner/settings').catch(() => ({ data: null }));
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" label="Yuklanmoqda..." />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sozlamalar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ustaxona ma'lumotlarini boshqaring
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        {activeTab === 'general' && <GeneralTab data={data?.info} />}
        {activeTab === 'schedule' && <ScheduleTab data={data?.schedule} />}
        {activeTab === 'services' && <ServicesTab data={data?.services} />}
        {activeTab === 'photos' && <PhotosTab data={data?.photos} />}
      </div>
    </motion.div>
  );
};

/* ======================== General Tab ======================== */
const GeneralTab: React.FC<{ data?: WorkshopInfo }> = ({ data }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<WorkshopInfo>({
    name: '',
    description: '',
    address: '',
    phone: '',
    city: '',
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: WorkshopInfo) => {
      await api.put('/partner/settings/info', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-settings'] });
      toast.success("Ma'lumotlar saqlandi");
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const handleChange = (field: keyof WorkshopInfo, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl space-y-5">
        <Input
          label="Ustaxona nomi"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Tavsif
          </label>
          <textarea
            className="flex min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>
        <Input
          label="Manzil"
          value={form.address}
          onChange={(e) => handleChange('address', e.target.value)}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Telefon"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
          <Input
            label="Shahar"
            value={form.city}
            onChange={(e) => handleChange('city', e.target.value)}
          />
        </div>
        <div className="pt-2">
          <Button
            icon={<Save className="h-4 w-4" />}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            Saqlash
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ======================== Schedule Tab ======================== */
const ScheduleTab: React.FC<{ data?: WorkSchedule[] }> = ({ data }) => {
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState<WorkSchedule[]>([]);

  useEffect(() => {
    if (data) setSchedule(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: WorkSchedule[]) => {
      await api.put('/partner/settings/schedule', { schedule: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-settings'] });
      toast.success('Ish grafigi saqlandi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const updateDay = (
    index: number,
    field: keyof WorkSchedule,
    value: string | boolean
  ) => {
    setSchedule((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl space-y-3">
        {schedule.map((day, i) => (
          <div
            key={day.day_of_week}
            className={cn(
              'flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between',
              day.is_closed
                ? 'border-gray-200 bg-gray-50'
                : 'border-gray-100'
            )}
          >
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={!day.is_closed}
                  onChange={(e) => updateDay(i, 'is_closed', !e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span
                  className={cn(
                    'w-28 text-sm font-medium',
                    day.is_closed ? 'text-gray-400' : 'text-gray-900'
                  )}
                >
                  {day.day_label}
                </span>
              </label>
            </div>
            {!day.is_closed && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={day.open_time}
                  onChange={(e) => updateDay(i, 'open_time', e.target.value)}
                  className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="time"
                  value={day.close_time}
                  onChange={(e) => updateDay(i, 'close_time', e.target.value)}
                  className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {day.is_closed && (
              <span className="text-sm text-gray-400">Dam olish kuni</span>
            )}
          </div>
        ))}
        <div className="pt-2">
          <Button
            icon={<Save className="h-4 w-4" />}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate(schedule)}
          >
            Saqlash
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ======================== Services Tab ======================== */
const ServicesTab: React.FC<{ data?: WorkshopService[] }> = ({ data }) => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<WorkshopService | null>(null);
  const [form, setForm] = useState({
    name: '',
    price_from: '',
    price_to: '',
    duration: '',
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: number;
      name: string;
      price_from: number;
      price_to: number;
      duration: number;
    }) => {
      if (payload.id) {
        await api.put(`/partner/settings/services/${payload.id}`, payload);
      } else {
        await api.post('/partner/settings/services', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-settings'] });
      setModalOpen(false);
      setEditingService(null);
      toast.success('Xizmat saqlandi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/partner/settings/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-settings'] });
      toast.success("Xizmat o'chirildi");
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const openAdd = () => {
    setEditingService(null);
    setForm({ name: '', price_from: '', price_to: '', duration: '' });
    setModalOpen(true);
  };

  const openEdit = (service: WorkshopService) => {
    setEditingService(service);
    setForm({
      name: service.name,
      price_from: String(service.price_from),
      price_to: String(service.price_to),
      duration: String(service.duration),
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    saveMutation.mutate({
      id: editingService?.id,
      name: form.name,
      price_from: Number(form.price_from),
      price_to: Number(form.price_to),
      duration: Number(form.duration),
    });
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Xizmatlar ro'yxati</h3>
        <Button
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={openAdd}
        >
          Yangi xizmat
        </Button>
      </div>

      {!data?.length ? (
        <EmptyState
          icon={<Wrench className="h-8 w-8" />}
          title="Xizmatlar yo'q"
          description="Yangi xizmat qo'shing"
          actionLabel="Xizmat qo'shish"
          onAction={openAdd}
        />
      ) : (
        <div className="space-y-3">
          {data.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-gray-900">{service.name}</p>
                <p className="text-sm text-gray-500">
                  {formatPrice(service.price_from)} &mdash;{' '}
                  {formatPrice(service.price_to)} &middot; {service.duration}{' '}
                  daqiqa
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Edit3 className="h-4 w-4" />}
                  onClick={() => openEdit(service)}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="h-4 w-4 text-red-500" />}
                  onClick={() => deleteMutation.mutate(service.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingService ? 'Xizmatni tahrirlash' : 'Yangi xizmat'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Xizmat nomi"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Narx (dan)"
              type="number"
              value={form.price_from}
              onChange={(e) =>
                setForm((f) => ({ ...f, price_from: e.target.value }))
              }
            />
            <Input
              label="Narx (gacha)"
              type="number"
              value={form.price_to}
              onChange={(e) =>
                setForm((f) => ({ ...f, price_to: e.target.value }))
              }
            />
          </div>
          <Input
            label="Davomiyligi (daqiqa)"
            type="number"
            value={form.duration}
            onChange={(e) =>
              setForm((f) => ({ ...f, duration: e.target.value }))
            }
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              loading={saveMutation.isPending}
              onClick={handleSubmit}
            >
              Saqlash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ======================== Photos Tab ======================== */
const PhotosTab: React.FC<{ data?: WorkshopPhoto[] }> = ({ data }) => {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      await api.post('/partner/settings/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-settings'] });
      toast.success('Rasm yuklandi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/partner/settings/photos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-settings'] });
      toast.success("Rasm o'chirildi");
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Rasmlar</h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            size="sm"
            icon={<Upload className="h-4 w-4" />}
            loading={uploadMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            Rasm yuklash
          </Button>
        </div>
      </div>

      {!data?.length ? (
        <EmptyState
          icon={<ImageIcon className="h-8 w-8" />}
          title="Rasmlar yo'q"
          description="Ustaxona rasmlari qo'shing"
          actionLabel="Rasm yuklash"
          onAction={() => fileInputRef.current?.click()}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-gray-100"
            >
              <img
                src={photo.url}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => deleteMutation.mutate(photo.id)}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartnerSettingsPage;
