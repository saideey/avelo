import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Car,
  MessageSquare,
  MapPin,
  Star,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/Button';
import { cn, formatPrice } from '@/shared/lib/utils';
import api from '@/shared/api/axios';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Workshop {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  phone: string;
  services: WorkshopService[];
  schedules: unknown[];
  rating_avg: number | null;
}

interface WorkshopService {
  id: number;
  name: string;
  price?: number;
  price_from?: number;
  price_to?: number;
}

interface Vehicle {
  id: number;
  brand_name: string;
  model_name: string;
  year: number;
  license_plate: string;
  color: string;
}

interface Slot {
  time: string;
  available: number;
  booked: number;
  max: number;
  status: 'free' | 'limited' | 'full';
}

interface SlotsResponse {
  date: string;
  day_label: string;
  is_closed: boolean;
  open_time: string;
  close_time: string;
  slot_duration: number;
  max_parallel: number;
  slots: Slot[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const DAY_NAMES = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const MONTH_NAMES = [
  'yan', 'fev', 'mar', 'apr', 'may', 'iyun',
  'iyul', 'avg', 'sen', 'okt', 'noy', 'dek',
];

function getNext14Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatServicePrice(s: WorkshopService): string {
  if (s.price_from && s.price_to) {
    return `${formatPrice(s.price_from)} - ${formatPrice(s.price_to)}`;
  }
  if (s.price_from) return `${formatPrice(s.price_from)}+`;
  if (s.price) return formatPrice(s.price);
  return '';
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function BookingConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const workshop = (location.state as { workshop?: Workshop })?.workshop;

  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const calendarRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => getNext14Days(), []);

  // ---- Queries ----

  const dateStr = toDateStr(selectedDate);

  const {
    data: slotsData,
    isLoading: slotsLoading,
    isError: slotsError,
  } = useQuery<SlotsResponse>({
    queryKey: ['workshop-slots', workshop?.id, dateStr],
    queryFn: () =>
      api.get(`/workshops/${workshop!.id}/slots?date=${dateStr}`).then((r) => r.data),
    enabled: !!workshop,
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['my-vehicles'],
    queryFn: () => api.get('/users/me/vehicles').then((r) => r.data),
  });

  // Reset selected time when date changes
  useEffect(() => {
    setSelectedTime(null);
  }, [dateStr]);

  // ---- Mutations ----

  const bookingMutation = useMutation({
    mutationFn: (payload: {
      workshop_id: string;
      scheduled_at: string;
      vehicle_id?: string;
      service_ids?: (string | number)[];
      notes?: string;
      total_price?: number;
      is_mobile: boolean;
    }) => api.post('/bookings/', payload).then((r) => r.data),
    onSuccess: (data) => {
      toast.success('Buyurtma muvaffaqiyatli yaratildi');
      navigate('/booking/payment', { state: { booking: data } });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      const msg =
        typeof detail === 'string' ? detail : 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.';
      toast.error(msg);
    },
  });

  // ---- Guard ----

  if (!workshop) return <Navigate to="/" replace />;

  // ---- Derived ----

  const services: WorkshopService[] = workshop.services || [];
  const today = new Date();

  const totalPrice = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + (s.price || s.price_from || 0), 0);

  const canSubmit =
    selectedTime !== null && selectedServices.length > 0 && !bookingMutation.isPending;

  const formattedSelectedDate = selectedTime
    ? `${selectedDate.getDate()}-${MONTH_NAMES[selectedDate.getMonth()]}, ${selectedTime}`
    : null;

  // ---- Handlers ----

  const toggleService = (id: number) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const scrollCalendar = (dir: 'left' | 'right') => {
    calendarRef.current?.scrollBy({
      left: dir === 'left' ? -200 : 200,
      behavior: 'smooth',
    });
  };

  const handleSubmit = () => {
    if (!canSubmit || !selectedTime) return;

    const scheduled = new Date(selectedDate);
    const [h, m] = selectedTime.split(':');
    scheduled.setHours(Number(h), Number(m), 0, 0);

    bookingMutation.mutate({
      workshop_id: workshop.id,
      scheduled_at: scheduled.toISOString(),
      vehicle_id: vehicleId ?? undefined,
      service_ids: selectedServices.length > 0 ? selectedServices : undefined,
      notes: notes.trim() || undefined,
      total_price: totalPrice,
      is_mobile: false,
    });
  };

  // ---- Render ----

  return (
    <div className="mx-auto max-w-lg pb-40">
      {/* ===== Header ===== */}
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded-full p-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Orqaga</span>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Band qilish</h1>
          <div className="w-16" />
        </div>
        <div className="flex items-center gap-2 px-4 pb-3">
          <p className="font-semibold text-gray-900">{workshop.name}</p>
          {workshop.rating_avg && (
            <span className="flex items-center gap-0.5 text-sm text-amber-500">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {workshop.rating_avg.toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 px-4 pb-3 text-sm text-gray-500">
          <MapPin className="h-3.5 w-3.5" />
          <span>{workshop.address}</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 px-4 pt-5"
      >
        {/* ===== Section 1: Xizmat tanlash ===== */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Xizmat tanlash</h3>
          <div className="space-y-2">
            {services.map((s) => {
              const isSelected = selectedServices.includes(s.id);
              return (
                <motion.button
                  key={s.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleService(s.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all',
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 bg-white hover:border-gray-200',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all',
                        isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 bg-white',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-blue-600">
                    {formatServicePrice(s)}
                  </span>
                </motion.button>
              );
            })}
            {services.length === 0 && (
              <p className="text-sm text-gray-400">Xizmatlar mavjud emas</p>
            )}
          </div>
        </section>

        {/* ===== Section 2: Mashina tanlash ===== */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Car className="h-4 w-4 text-gray-400" />
            Mashina tanlash
          </h3>
          {vehicles && vehicles.length > 0 ? (
            <select
              value={vehicleId ?? ''}
              onChange={(e) =>
                setVehicleId(e.target.value || null)
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Mashinani tanlang</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand_name} {v.model_name} {v.year} &middot; {v.license_plate}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-400">Mashinalar topilmadi</p>
          )}
        </section>

        {/* ===== Section 3: Sana tanlash ===== */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Calendar className="h-4 w-4 text-gray-400" />
            Sana tanlash
          </h3>
          <div className="relative">
            {/* Scroll arrows */}
            <button
              onClick={() => scrollCalendar('left')}
              className="absolute -left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-1 shadow-md hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={() => scrollCalendar('right')}
              className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-1 shadow-md hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>

            <div
              ref={calendarRef}
              className="flex gap-2 overflow-x-auto px-5 pb-2 scrollbar-hide"
            >
              {days.map((d) => {
                const isToday = d.toDateString() === today.toDateString();
                const isSelected = d.toDateString() === selectedDate.toDateString();

                return (
                  <button
                    key={toDateStr(d)}
                    onClick={() => setSelectedDate(d)}
                    className={cn(
                      'flex shrink-0 flex-col items-center gap-1 rounded-xl px-3.5 py-2.5 transition-all',
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                        : isToday
                          ? 'border-2 border-blue-200 bg-blue-50 text-blue-700'
                          : 'border border-gray-100 bg-white text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase',
                        isSelected ? 'text-blue-100' : 'text-gray-400',
                      )}
                    >
                      {DAY_NAMES[d.getDay()]}
                    </span>
                    <span className="text-lg font-bold">{d.getDate()}</span>
                    {isToday && !isSelected && (
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    )}
                    {isSelected && isToday && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== Section 4: Vaqt tanlash ===== */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Clock className="h-4 w-4 text-gray-400" />
            Vaqt tanlash
          </h3>

          {slotsData && !slotsData.is_closed && (
            <p className="mb-3 text-sm text-gray-500">
              {selectedDate.getDate()}-{MONTH_NAMES[selectedDate.getMonth()]},{' '}
              {slotsData.day_label}
            </p>
          )}

          {slotsLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          )}

          {slotsError && (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-red-50 py-8 text-center">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-sm text-red-600">
                Vaqt slotlarini yuklashda xatolik yuz berdi
              </p>
            </div>
          )}

          {slotsData?.is_closed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 py-8 text-center"
            >
              <AlertCircle className="h-6 w-6 text-gray-400" />
              <p className="text-sm font-medium text-gray-500">Bu kun yopiq</p>
            </motion.div>
          )}

          {slotsData && !slotsData.is_closed && slotsData.slots.length > 0 && (
            <AnimatePresence mode="wait">
              <motion.div
                key={dateStr}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="grid grid-cols-4 gap-2">
                  {slotsData.slots.map((slot) => {
                    const isFull = slot.status === 'full';
                    const isLimited = slot.status === 'limited';
                    const isSelected = selectedTime === slot.time;

                    return (
                      <button
                        key={slot.time}
                        disabled={isFull}
                        onClick={() => setSelectedTime(slot.time)}
                        className={cn(
                          'relative rounded-lg py-2.5 text-sm font-medium transition-all',
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-300'
                            : isFull
                              ? 'cursor-not-allowed bg-red-50 text-red-400 border-2 border-red-200'
                              : isLimited
                                ? 'border-2 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-sm'
                                : 'border-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm',
                        )}
                      >
                        {isSelected && (
                          <Check className="absolute right-1 top-1 h-3 w-3 text-white" />
                        )}
                        <span>{slot.time}</span>
                        {isLimited && !isSelected && (
                          <span className="block text-[10px] font-normal">
                            Oxirgi {slot.available} joy
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                    Bo'sh
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    Oxirgi joy
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    Band
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </section>

        {/* ===== Section 5: Izoh ===== */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            Izoh
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Qo'shimcha ma'lumot yozing..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </section>
      </motion.div>

      {/* ===== Sticky CTA Bar ===== */}
      <div className="fixed inset-x-0 bottom-[60px] z-30 border-t border-gray-200 bg-white/95 backdrop-blur-md md:bottom-0">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Jami</p>
              <p className="text-lg font-bold text-gray-900">
                {totalPrice > 0 ? formatPrice(totalPrice) : "0 so'm"}
              </p>
            </div>
            {formattedSelectedDate && (
              <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                <Calendar className="h-3.5 w-3.5" />
                {formattedSelectedDate}
              </div>
            )}
          </div>
          <Button
            size="lg"
            fullWidth
            loading={bookingMutation.isPending}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Band qilish
          </Button>
        </div>
      </div>
    </div>
  );
}
