import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Settings,
  Pencil,
  Check,
  X,
  Shield,
  CreditCard,
  Clock,
  Globe,
} from 'lucide-react';
import api from '@/shared/api/axios';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { toast } from 'sonner';

interface Setting {
  key: string;
  value: string;
  label: string;
  category: string;
  description?: string;
}

interface SettingsResponse {
  settings: Setting[];
}

const defaultSettings: Setting[] = [
  { key: 'commission_percent', value: '10', label: 'Komissiya foizi', category: 'Umumiy', description: 'Har bir buyurtmadan olinadigan komissiya foizi' },
  { key: 'warranty_default_months', value: '3', label: 'Kafolat muddati', category: 'Kafolat', description: 'Standart kafolat muddati (oy)' },
  { key: 'max_file_size_mb', value: '10', label: 'Max fayl hajmi', category: 'Umumiy', description: 'Yuklanadigan fayl hajmi limiti (MB)' },
  { key: 'booking_cancel_hours', value: '2', label: 'Bekor qilish muddati', category: 'Umumiy', description: 'Buyurtmani bekor qilish uchun vaqt (soat)' },
  { key: 'min_withdrawal_amount', value: '100000', label: 'Min pul yechish', category: "To'lov", description: 'Minimal pul yechish miqdori (so\'m)' },
  { key: 'max_daily_bookings', value: '50', label: 'Kunlik max buyurtmalar', category: 'Umumiy', description: 'Bir ustaxona uchun kunlik buyurtma limiti' },
  { key: 'otp_expire_minutes', value: '5', label: 'OTP muddati', category: 'Xavfsizlik', description: 'OTP kodining amal qilish muddati (daqiqa)' },
];

const categoryConfig: Record<string, { icon: React.ReactNode; gradient: string }> = {
  'Umumiy': { icon: <Globe className="h-5 w-5" />, gradient: 'from-blue-500 to-blue-600' },
  "To'lov": { icon: <CreditCard className="h-5 w-5" />, gradient: 'from-emerald-500 to-emerald-600' },
  'Kafolat': { icon: <Clock className="h-5 w-5" />, gradient: 'from-orange-500 to-orange-600' },
  'Xavfsizlik': { icon: <Shield className="h-5 w-5" />, gradient: 'from-red-500 to-red-600' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const AdminSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data, isLoading } = useQuery<SettingsResponse>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/admin/settings');
        // API returns grouped: {"settings": {"payment": [...], "general": [...]}}
        // Flatten to array
        if (data?.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
          const flat: Setting[] = [];
          for (const items of Object.values(data.settings) as any[][]) {
            for (const item of items) {
              const def = defaultSettings.find((d) => d.key === item.key);
              flat.push({ ...item, label: def?.label || item.key, category: def?.category || item.category || 'Umumiy' });
            }
          }
          return { settings: flat };
        }
        return data;
      } catch {
        return { settings: defaultSettings };
      }
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await api.put(`/admin/settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setEditingKey(null);
      setEditValue('');
      toast.success('Sozlama muvaffaqiyatli yangilandi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const settings = data?.settings ?? defaultSettings;

  // Group settings by category
  const grouped = settings.reduce<Record<string, Setting[]>>((acc, setting) => {
    if (!acc[setting.category]) acc[setting.category] = [];
    acc[setting.category].push(setting);
    return acc;
  }, {});

  const startEdit = (setting: Setting) => {
    setEditingKey(setting.key);
    setEditValue(setting.value);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveEdit = (key: string) => {
    updateSetting.mutate({ key, value: editValue });
  };

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
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Sozlamalar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platforma sozlamalarini boshqaring (faqat Super Admin)
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Object.entries(grouped).map(([category, items]) => {
          const config = categoryConfig[category] ?? { icon: <Settings className="h-5 w-5" />, gradient: 'from-gray-500 to-gray-600' };
          return (
            <motion.div
              key={category}
              variants={itemVariants}
              className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden"
            >
              {/* Category Header */}
              <div className={cn('bg-gradient-to-r p-4 text-white', config.gradient)}>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white/20 p-2">
                    {config.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{category}</h2>
                    <p className="text-sm text-white/70">{items.length} ta sozlama</p>
                  </div>
                </div>
              </div>

              {/* Settings List */}
              <div className="divide-y divide-gray-50">
                {items.map((setting) => (
                  <div key={setting.key} className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {setting.label}
                        </p>
                        {setting.description && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {setting.description}
                          </p>
                        )}
                      </div>

                      {editingKey === setting.key ? (
                        <div className="flex items-center gap-2 ml-4">
                          <Input
                            className="w-28"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(setting.key);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <button
                            className="rounded-full p-1.5 text-green-600 hover:bg-green-50 transition-colors"
                            onClick={() => saveEdit(setting.key)}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 ml-4">
                          <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-mono font-semibold text-gray-800">
                            {setting.value}
                          </span>
                          <button
                            className="rounded-full p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => startEdit(setting)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AdminSettingsPage;
