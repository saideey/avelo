import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Package, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/components/Input';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';
import { PriceTag } from '@/shared/components/PriceTag';
import { Badge } from '@/shared/components/Badge';
import { useDebounce } from '@/shared/hooks/useDebounce';
import api from '@/shared/api/axios';

export default function PartsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['parts', debouncedQuery],
    queryFn: () => {
      const params = debouncedQuery ? `?search=${debouncedQuery}` : '';
      return api.get(`/parts${params}`).then((r) => r.data).catch(() => []);
    },
  });

  const parts = data?.items || data?.results || (Array.isArray(data) ? data : []);

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{t('nav.parts')}</h1>
      </div>

      <div className="mt-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ehtiyot qism qidirish..."
          iconLeft={<Search className="h-4 w-4" />}
        />
      </div>

      <div className="mt-5">
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : parts.length === 0 ? (
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title="Ehtiyot qismlar topilmadi"
          />
        ) : (
          <div className="space-y-3">
            {parts.map((p: any, i: number) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/parts/${p.id}`)}
                className="flex cursor-pointer items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 truncate">{p.brand || p.category}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <PriceTag price={p.price} size="sm" />
                    {p.in_stock && (
                      <Badge variant="success" size="sm">Mavjud</Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
