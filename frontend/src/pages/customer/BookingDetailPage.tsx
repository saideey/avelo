import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  Car,
  X,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { PriceTag } from '@/shared/components/PriceTag';
import { Button } from '@/shared/components/Button';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { StarRating } from '@/shared/components/StarRating';
import { Modal } from '@/shared/components/Modal';
import { formatPrice, cn } from '@/shared/lib/utils';
import api from '@/shared/api/axios';

const statusSteps = [
  { key: 'pending', label: 'Kutilmoqda' },
  { key: 'confirmed', label: 'Tasdiqlangan' },
  { key: 'in_progress', label: 'Jarayonda' },
  { key: 'completed', label: 'Tugallangan' },
];

function getStepIndex(status: string): number {
  const idx = statusSteps.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [ratings, setRatings] = useState({
    quality: 0,
    speed: 0,
    price: 0,
    service: 0,
  });
  const [comment, setComment] = useState('');

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get(`/bookings/${id}`).then((r) => r.data).catch(() => null),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.patch(`/bookings/${id}/cancel`),
    onSuccess: () => {
      toast.success('Buyurtma bekor qilindi');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: any) => api.post('/reviews/', { ...payload, booking_id: id }),
    onSuccess: () => {
      toast.success('Reyting muvaffaqiyatli qoldirildi!');
      setReviewOpen(false);
      setRatings({ quality: 0, speed: 0, price: 0, service: 0 });
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const handleSubmitReview = () => {
    const avg =
      (ratings.quality + ratings.speed + ratings.price + ratings.service) / 4;
    reviewMutation.mutate({
      rating: avg,
      quality_rating: ratings.quality,
      speed_rating: ratings.speed,
      price_rating: ratings.price,
      service_rating: ratings.service,
      comment: comment || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!booking) return null;

  const services = booking.services || [];
  const currentStep = getStepIndex(booking.status);
  const isCancelled = booking.status === 'cancelled';
  const canCancel =
    booking.status === 'pending' || booking.status === 'confirmed';
  const canReview = booking.status === 'completed' && !booking.has_review;

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      {/* header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-1.5 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-gray-900">
          Buyurtma #{booking.id?.slice(-6)}
        </h1>
        <StatusBadge status={booking.status} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 space-y-4"
      >
        {/* status progress bar */}
        {!isCancelled && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Holat</h3>
            <div className="relative flex items-center justify-between">
              {/* background line */}
              <div className="absolute left-[16px] right-[16px] top-4 h-0.5 bg-gray-200" />
              {/* active line */}
              <div
                className="absolute left-[16px] top-4 h-0.5 bg-blue-600 transition-all duration-700"
                style={{
                  width:
                    currentStep === 0
                      ? '0%'
                      : `calc(${(currentStep / (statusSteps.length - 1)) * 100}% - 32px * ${1 - currentStep / (statusSteps.length - 1)})`,
                }}
              />

              {statusSteps.map((step, i) => {
                const isActive = i <= currentStep;
                const isCurrent = i === currentStep;
                return (
                  <div
                    key={step.key}
                    className="relative z-10 flex flex-col items-center"
                  >
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                        isActive
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white text-gray-400',
                        isCurrent && 'ring-4 ring-blue-100',
                      )}
                    >
                      {isActive ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                      )}
                    </motion.div>
                    <span
                      className={cn(
                        'mt-2 w-16 text-center text-[10px] font-medium',
                        isActive ? 'text-blue-700' : 'text-gray-400',
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* workshop */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500">Ustaxona</h3>
          <p className="mt-1 text-base font-bold text-gray-900">
            {booking.workshop_name}
          </p>
          {booking.workshop_address && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
              {booking.workshop_address}
            </div>
          )}
          {booking.workshop_phone && (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <Phone className="h-4 w-4 shrink-0 text-gray-400" />
              {booking.workshop_phone}
            </div>
          )}
        </div>

        {/* date & time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              Sana
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {new Date(booking.scheduled_at).toLocaleDateString('uz-UZ', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              Vaqt
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {new Date(booking.scheduled_at).toLocaleTimeString('uz-UZ', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* vehicle */}
        {booking.vehicle && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Car className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {booking.vehicle.make} {booking.vehicle.model} (
                  {booking.vehicle.year})
                </p>
                <p className="text-xs text-gray-500">
                  {booking.vehicle.plate_number}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* services */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <h3 className="px-4 pt-4 text-sm font-semibold text-gray-500">
            Xizmatlar
          </h3>
          <div className="mt-2 divide-y divide-gray-50 px-4">
            {services.map((s: any) => (
              <div
                key={s.id || s.name}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-sm text-gray-900">{s.name}</span>
                <PriceTag price={s.price} priceFrom={s.price_from} size="sm" />
              </div>
            ))}
          </div>
          <div className="mx-4 flex items-center justify-between border-t border-gray-200 py-3">
            <span className="text-sm font-semibold text-gray-900">Jami</span>
            <span className="text-base font-bold text-gray-900">
              {formatPrice(booking.total_price || 0)}
            </span>
          </div>
        </div>

        {/* notes */}
        {booking.notes && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MessageSquare className="h-4 w-4" />
              Izoh
            </div>
            <p className="mt-1 text-sm text-gray-700">{booking.notes}</p>
          </div>
        )}

        {/* actions */}
        <div className="flex gap-3 pt-2">
          {canCancel && (
            <Button
              variant="danger"
              fullWidth
              loading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
              icon={<X className="h-4 w-4" />}
            >
              Bekor qilish
            </Button>
          )}
          {canReview && (
            <Button
              fullWidth
              onClick={() => setReviewOpen(true)}
              icon={<Star className="h-4 w-4" />}
            >
              Reyting qoldirish
            </Button>
          )}
        </div>
      </motion.div>

      {/* review modal */}
      <Modal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        title="Reyting qoldirish"
        description="Xizmat sifatini baholang"
      >
        <div className="space-y-5">
          {[
            { key: 'quality', label: 'Sifat' },
            { key: 'speed', label: 'Tezlik' },
            { key: 'price', label: 'Narx' },
            { key: 'service', label: "Xizmat ko'rsatish" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {item.label}
              </span>
              <StarRating
                value={ratings[item.key as keyof typeof ratings]}
                onChange={(v) =>
                  setRatings((prev) => ({ ...prev, [item.key]: v }))
                }
                interactive
                size="md"
              />
            </div>
          ))}

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Izoh qoldiring..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <Button
            fullWidth
            loading={reviewMutation.isPending}
            disabled={
              !ratings.quality ||
              !ratings.speed ||
              !ratings.price ||
              !ratings.service
            }
            onClick={handleSubmitReview}
          >
            Yuborish
          </Button>
        </div>
      </Modal>
    </div>
  );
}
