import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Search as SearchIcon,
  AlertTriangle,
} from 'lucide-react';
import api from '@/shared/api/axios';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Modal } from '@/shared/components/Modal';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';
import { toast } from 'sonner';

interface WarrantyClaim {
  id: number;
  service_name: string;
  customer_name: string;
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected';
  date: string;
  description: string;
  rejection_reason?: string;
}

const statusConfig: Record<string, { variant: 'warning' | 'primary' | 'success' | 'danger'; label: string; icon: React.ReactNode }> = {
  submitted: {
    variant: 'warning',
    label: 'Yuborilgan',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  reviewing: {
    variant: 'primary',
    label: "Ko'rib chiqilmoqda",
    icon: <SearchIcon className="h-3.5 w-3.5" />,
  },
  approved: {
    variant: 'success',
    label: 'Tasdiqlangan',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  rejected: {
    variant: 'danger',
    label: 'Rad etilgan',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const PartnerWarrantyPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: claims, isLoading } = useQuery<WarrantyClaim[]>({
    queryKey: ['partner-warranty-claims'],
    queryFn: async () => {
      const { data } = await api.get('/partner/warranty-claims');
      return data;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/partner/warranty-claims/${id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-warranty-claims'] });
      toast.success('Kafolat talabi tasdiqlandi');
    },
    onError: () => {
      toast.error('Xatolik yuz berdi');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.patch(`/partner/warranty-claims/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-warranty-claims'] });
      toast.success('Kafolat talabi rad etildi');
      setRejectModalOpen(false);
      setRejectingId(null);
      setRejectReason('');
    },
    onError: () => {
      toast.error('Xatolik yuz berdi');
    },
  });

  const openRejectModal = (id: number) => {
    setRejectingId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = () => {
    if (!rejectingId || !rejectReason.trim()) return;
    rejectMutation.mutate({ id: rejectingId, reason: rejectReason.trim() });
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
        <h1 className="text-2xl font-bold text-gray-900">Kafolat talablari</h1>
        <p className="mt-1 text-sm text-gray-500">
          Mijozlardan kelgan kafolat talablarini boshqaring
        </p>
      </motion.div>

      {!claims?.length ? (
        <EmptyState
          icon={<Shield className="h-8 w-8" />}
          title="Kafolat talablari yo'q"
          description="Hozircha hech qanday kafolat talabi mavjud emas"
        />
      ) : (
        <motion.div className="space-y-4" variants={containerVariants}>
          {claims.map((claim) => {
            const conf = statusConfig[claim.status];
            const isPending = claim.status === 'submitted' || claim.status === 'reviewing';

            return (
              <motion.div
                key={claim.id}
                variants={itemVariants}
                className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900">{claim.service_name}</h3>
                      <Badge variant={conf.variant} size="sm">
                        {conf.icon}
                        <span className="ml-1">{conf.label}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{claim.customer_name}</span>
                      <span className="text-gray-300">|</span>
                      <span>{claim.date}</span>
                    </div>
                    <p className="text-sm text-gray-600">{claim.description}</p>
                    {claim.rejection_reason && (
                      <div className="rounded-lg bg-red-50 p-3 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-red-700">Rad etish sababi</p>
                          <p className="text-sm text-red-600">{claim.rejection_reason}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-green-600 hover:bg-green-700"
                        icon={<CheckCircle className="h-4 w-4" />}
                        onClick={() => acceptMutation.mutate(claim.id)}
                        disabled={acceptMutation.isPending}
                      >
                        Qabul qilish
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<XCircle className="h-4 w-4" />}
                        onClick={() => openRejectModal(claim.id)}
                      >
                        Rad etish
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Reject Reason Modal */}
      <Modal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        title="Rad etish sababi"
        description="Kafolat talabini rad etish sababini kiriting"
        size="sm"
      >
        <div className="space-y-4">
          <textarea
            className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            rows={3}
            placeholder="Sababni yozing..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRejectModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Yuborilmoqda...' : 'Rad etish'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default PartnerWarrantyPage;
