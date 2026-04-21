import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatPrice, cn } from '@/shared/lib/utils';
import api from '@/shared/api/axios';

const tabs = [
  { key: 'active', label: 'Faol', statuses: 'pending,confirmed,in_progress' },
  { key: 'completed', label: 'Tugallangan', statuses: 'completed,cancelled' },
];

export default function BookingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');

  const currentTab = tabs.find((tab) => tab.key === activeTab)!;

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', activeTab],
    queryFn: () =>
      api.get('/users/me/bookings', { params: { status: currentTab.statuses } }).then((r) => r.data).catch(() => []),
  });

  const bookings = data?.items || data?.results || (Array.isArray(data) ? data : []);

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <h1 className="text-xl font-bold text-gray-900">{t('nav.bookings')}</h1>

      {/* tabs */}
      <div className="mt-4 flex rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* list */}
      <div className="mt-5">
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-8 w-8" />}
            title="Buyurtmalar yo'q"
            description={
              activeTab === 'active'
                ? "Hozircha faol buyurtmalar yo'q"
                : "Tugallangan buyurtmalar yo'q"
            }
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div layout className="space-y-3">
              {bookings.map((b: any, i: number) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  layout
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/bookings/${b.id}`)}
                  className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{b.workshop_name}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(b.scheduled_at).toLocaleDateString('uz-UZ', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>

                  {b.services && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {b.services.slice(0, 3).map((s: any) => (
                        <span
                          key={s.name || s.id}
                          className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                        >
                          {s.name}
                        </span>
                      ))}
                      {b.services.length > 3 && (
                        <span className="text-xs text-gray-400">+{b.services.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatPrice(b.total_price || 0)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
