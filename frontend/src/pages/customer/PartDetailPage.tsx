import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/Button';
import { PriceTag } from '@/shared/components/PriceTag';
import { Badge } from '@/shared/components/Badge';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import api from '@/shared/api/axios';

export default function PartDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: part, isLoading } = useQuery({
    queryKey: ['part', id],
    queryFn: () => api.get(`/parts/${id}`).then((r) => r.data).catch(() => null),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!part) return null;

  return (
    <div className="mx-auto max-w-lg pb-24">
      {/* header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate">{part.name}</h1>
      </div>

      {/* image */}
      <div className="aspect-square w-full bg-gray-100">
        {part.image ? (
          <img src={part.image} alt={part.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-20 w-20 text-gray-300" />
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 px-4 pt-5"
      >
        <div>
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-gray-900">{part.name}</h2>
            {part.in_stock && (
              <Badge variant="success">Mavjud</Badge>
            )}
          </div>
          {part.brand && (
            <p className="mt-1 text-sm text-gray-500">{part.brand}</p>
          )}
          <div className="mt-3">
            <PriceTag price={part.price} size="lg" />
          </div>
        </div>

        {part.description && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Tavsif</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{part.description}</p>
          </div>
        )}

        {part.specifications && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Xususiyatlari</h3>
            <div className="mt-2 space-y-2">
              {Object.entries(part.specifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{key}</span>
                  <span className="font-medium text-gray-900">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* bottom CTA */}
      <div className="fixed inset-x-0 bottom-[60px] md:bottom-0 z-30 border-t border-gray-200 bg-white/90 p-3 md:p-4 backdrop-blur-md">
        <div className="mx-auto max-w-lg">
          <Button fullWidth size="lg" icon={<ShoppingCart className="h-5 w-5" />}>
            Buyurtma berish
          </Button>
        </div>
      </div>
    </div>
  );
}
