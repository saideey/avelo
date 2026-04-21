import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Calendar, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/components/Badge';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';
import api from '@/shared/api/axios';

export default function WarrantiesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['warranties'],
    queryFn: () => api.get('/users/me/warranties').then((r) => r.data).catch(() => []),
  });

  const warranties = data?.items || data?.results || (Array.isArray(data) ? data : []);

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{t('nav.warranties')}</h1>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : warranties.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-8 w-8" />}
            title="Kafolatlar yo'q"
            description="Tugallangan xizmatlar uchun kafolatlar bu yerda ko'rinadi"
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            className="space-y-3"
          >
            {warranties.map((w: any) => {
              const expiresAt = new Date(w.expires_at);
              const isExpired = expiresAt < new Date();
              return (
                <motion.div
                  key={w.id}
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{w.service_name}</p>
                        <p className="text-xs text-gray-500">{w.workshop_name}</p>
                      </div>
                    </div>
                    <Badge variant={isExpired ? 'danger' : 'success'} size="sm">
                      {isExpired ? 'Muddati tugagan' : 'Faol'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    Amal qilish muddati: {expiresAt.toLocaleDateString('uz-UZ')}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
