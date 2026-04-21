import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { WorkshopCard } from '@/shared/components/WorkshopCard';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';
import api from '@/shared/api/axios';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get('/users/me/favorites').then((r) => r.data).catch(() => []),
  });

  const removeFavorite = useMutation({
    mutationFn: (workshopId: string | number) =>
      api.delete(`/users/me/favorites/${workshopId}`),
    onMutate: async (workshopId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previous = queryClient.getQueryData(['favorites']);
      queryClient.setQueryData(['favorites'], (old: any) => {
        if (!old) return old;
        const list = old?.items || old?.results || (Array.isArray(old) ? old : []);
        const filtered = list.filter((w: any) => w.id !== workshopId && w.workshop_id !== workshopId);
        if (old?.items) return { ...old, items: filtered };
        if (old?.results) return { ...old, results: filtered };
        return filtered;
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(['favorites'], context?.previous);
      toast.error('Xatolik yuz berdi');
    },
    onSuccess: () => {
      toast.success('Sevimlilardan olib tashlandi');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const favorites = data?.items || data?.results || (Array.isArray(data) ? data : []);

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      {/* header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Sevimli ustaxonalar</h1>
      </div>

      {/* content */}
      <div className="mt-5">
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : favorites.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-8 w-8" />}
            title="Sevimlilar bo'sh"
            description="Ustaxonalarni yoqtirganingizda bu yerda ko'rinadi"
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div layout className="grid gap-4 sm:grid-cols-2">
              {favorites.map((w: any, i: number) => (
                <motion.div
                  key={w.id || w.workshop_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.04 }}
                  layout
                  className="relative"
                >
                  <WorkshopCard
                    id={w.slug || w.id}
                    name={w.name}
                    photo={w.photo_url}
                    isVerified={w.is_verified}
                    rating={w.rating_avg || w.rating || 0}
                    reviewCount={w.total_reviews || w.review_count || 0}
                    address={w.address || w.city || ''}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite.mutate(w.id || w.workshop_id);
                    }}
                    className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-colors hover:bg-red-50"
                  >
                    <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
