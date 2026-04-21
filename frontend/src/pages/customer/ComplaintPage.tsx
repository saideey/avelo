import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  X,
  MessageSquareWarning,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';
import { cn } from '@/shared/lib/utils';
import api from '@/shared/api/axios';

const complaintTypes = [
  { value: 'service_quality', label: 'Xizmat sifati' },
  { value: 'payment_issue', label: "To'lov muammosi" },
  { value: 'warranty_issue', label: 'Kafolat muammosi' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'other', label: 'Boshqa' },
];

const priorityOptions = [
  { value: '1', label: 'Past', color: 'bg-gray-100 text-gray-700' },
  { value: '2', label: "O'rta", color: 'bg-yellow-100 text-yellow-700' },
  { value: '3', label: 'Yuqori', color: 'bg-orange-100 text-orange-700' },
  { value: '4', label: 'Juda muhim', color: 'bg-red-100 text-red-700' },
];

const statusConfig: Record<string, { icon: React.ReactNode; variant: 'default' | 'warning' | 'success' | 'danger' }> = {
  pending: { icon: <Clock className="h-3 w-3" />, variant: 'warning' },
  in_progress: { icon: <AlertTriangle className="h-3 w-3" />, variant: 'info' as any },
  resolved: { icon: <CheckCircle2 className="h-3 w-3" />, variant: 'success' },
  rejected: { icon: <XCircle className="h-3 w-3" />, variant: 'danger' },
};

const schema = z.object({
  subject: z.string().min(3, 'Kamida 3 belgi'),
  type: z.string().min(1, 'Turni tanlang'),
  description: z.string().min(10, 'Kamida 10 belgi'),
  priority: z.string().min(1, 'Muhimlik darajasini tanlang'),
  workshop_id: z.string().optional(),
});

type ComplaintForm = z.infer<typeof schema>;

export default function ComplaintPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-complaints'],
    queryFn: () => api.get('/users/me/complaints').then((r) => r.data).catch(() => []),
  });

  const { data: workshops } = useQuery({
    queryKey: ['workshops-list'],
    queryFn: () => api.get('/workshops/?limit=100').then((r) => r.data).catch(() => []),
    enabled: formOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ComplaintForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: '',
      type: '',
      description: '',
      priority: '2',
      workshop_id: '',
    },
  });

  const submitComplaint = useMutation({
    mutationFn: (data: ComplaintForm) =>
      api.post('/users/me/complaints', {
        subject: data.subject,
        description: data.description,
        type: data.type,
        priority: Number(data.priority),
        workshop_id: data.workshop_id || undefined,
      }),
    onSuccess: () => {
      toast.success('Shikoyat muvaffaqiyatli yuborildi');
      setFormOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['my-complaints'] });
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const complaints = data?.items || data?.results || (Array.isArray(data) ? data : []);
  const workshopList = workshops?.items || workshops?.results || (Array.isArray(workshops) ? workshops : []);

  const getTypeBadge = (type: string) => {
    const found = complaintTypes.find((t) => t.value === type);
    return found?.label || type;
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Shikoyatlar</h1>
        </div>
        <Button
          size="sm"
          icon={formOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          onClick={() => setFormOpen(!formOpen)}
          variant={formOpen ? 'secondary' : 'primary'}
        >
          {formOpen ? 'Bekor qilish' : 'Yangi shikoyat'}
        </Button>
      </div>

      {/* new complaint form */}
      <AnimatePresence>
        {formOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
            onSubmit={handleSubmit((d) => submitComplaint.mutate(d))}
          >
            <div className="mt-4 space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">Yangi shikoyat yuborish</h3>

              {/* subject */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Mavzu</label>
                <input
                  {...register('subject')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Shikoyat mavzusi"
                />
                {errors.subject && (
                  <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
                )}
              </div>

              {/* type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Turi</label>
                <select
                  {...register('type')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="">Tanlang...</option>
                  {complaintTypes.map((ct) => (
                    <option key={ct.value} value={ct.value}>
                      {ct.label}
                    </option>
                  ))}
                </select>
                {errors.type && (
                  <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>
                )}
              </div>

              {/* description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tavsif</label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                  placeholder="Muammoni batafsil tavsiflang..."
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
                )}
              </div>

              {/* priority */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Muhimlik darajasi
                </label>
                <div className="flex flex-wrap gap-2">
                  {priorityOptions.map((opt) => (
                    <label key={opt.value} className="cursor-pointer">
                      <input
                        type="radio"
                        value={opt.value}
                        {...register('priority')}
                        className="peer sr-only"
                      />
                      <span
                        className={cn(
                          'inline-block rounded-full px-3 py-1.5 text-xs font-medium transition-all peer-checked:ring-2 peer-checked:ring-blue-500 peer-checked:ring-offset-1',
                          opt.color,
                        )}
                      >
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.priority && (
                  <p className="mt-1 text-xs text-red-500">{errors.priority.message}</p>
                )}
              </div>

              {/* workshop select */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Ustaxona (ixtiyoriy)
                </label>
                <select
                  {...register('workshop_id')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="">Tanlang...</option>
                  {workshopList.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* submit */}
              <Button
                type="submit"
                fullWidth
                loading={submitComplaint.isPending}
              >
                Yuborish
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* complaints list */}
      <div className="mt-5">
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : complaints.length === 0 ? (
          <EmptyState
            icon={<MessageSquareWarning className="h-8 w-8" />}
            title="Shikoyatlar yo'q"
            description="Muammo bo'lsa, yangi shikoyat yuboring"
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {complaints.map((c: any, i: number) => {
              const status = statusConfig[c.status] || statusConfig.pending;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                      {c.subject}
                    </h3>
                    <Badge variant={status.variant} size="sm" className="shrink-0 flex items-center gap-1">
                      {status.icon}
                      {c.status === 'pending' && 'Kutilmoqda'}
                      {c.status === 'in_progress' && 'Jarayonda'}
                      {c.status === 'resolved' && 'Hal qilindi'}
                      {c.status === 'rejected' && 'Rad etildi'}
                      {!['pending', 'in_progress', 'resolved', 'rejected'].includes(c.status) && c.status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="primary" size="sm">
                      {getTypeBadge(c.type)}
                    </Badge>
                    {c.priority && (
                      <Badge
                        size="sm"
                        variant={
                          c.priority >= 4
                            ? 'danger'
                            : c.priority >= 3
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {priorityOptions.find((p) => p.value === String(c.priority))?.label || c.priority}
                      </Badge>
                    )}
                  </div>
                  {c.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{c.description}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('uz-UZ', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
