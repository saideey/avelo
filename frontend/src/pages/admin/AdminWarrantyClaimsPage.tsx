import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
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
  customer_name: string;
  customer_phone: string;
  workshop_name: string;
  service_name: string;
  booking_id: number;
  description: string;
  submitted_at: string;
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected';
  reject_reason?: string;
}

interface ClaimsResponse {
  items: WarrantyClaim[];
  total: number;
  page: number;
  pages: number;
}

const statusFilters = [
  { value: '', label: 'Barchasi' },
  { value: 'submitted', label: 'Yuborilgan' },
  { value: 'reviewing', label: "Ko'rib chiqilmoqda" },
  { value: 'approved', label: 'Tasdiqlangan' },
  { value: 'rejected', label: 'Rad etilgan' },
];

const claimStatusConfig: Record<
  string,
  { variant: 'warning' | 'primary' | 'success' | 'danger' | 'default'; label: string }
> = {
  submitted: { variant: 'warning', label: 'Yuborilgan' },
  reviewing: { variant: 'primary', label: "Ko'rib chiqilmoqda" },
  approved: { variant: 'success', label: 'Tasdiqlangan' },
  rejected: { variant: 'danger', label: 'Rad etilgan' },
};

const AdminWarrantyClaimsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [targetClaim, setTargetClaim] = useState<WarrantyClaim | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery<ClaimsResponse>({
    queryKey: ['admin-warranty-claims', { statusFilter, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/admin/warranty-claims', { params })
        .catch(() => ({ data: { items: [], total: 0, page: 1, pages: 1 } }));
      return {
        items: data?.items || [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        pages: data?.pages ?? 1,
      };
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/admin/warranty-claims/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-warranty-claims'] });
      toast.success('Ariza tasdiqlandi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.patch(`/admin/warranty-claims/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-warranty-claims'] });
      setRejectModal(false);
      setTargetClaim(null);
      setRejectReason('');
      toast.success('Ariza rad etildi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const openRejectModal = (claim: WarrantyClaim) => {
    setTargetClaim(claim);
    setRejectReason('');
    setRejectModal(true);
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kafolat arizalari</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kafolat bo'yicha arizalarni ko'rib chiqing
        </p>
      </div>

      {/* Status Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((sf) => (
          <button
            key={sf.value}
            onClick={() => {
              setStatusFilter(sf.value);
              setPage(1);
            }}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium transition-all',
              statusFilter === sf.value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* Claims Table */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" label="Yuklanmoqda..." />
          </div>
        ) : !data?.items?.length ? (
          <EmptyState
            icon={<Shield className="h-8 w-8" />}
            title="Arizalar topilmadi"
            description="Filterlarni o'zgartirib ko'ring"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="w-10 px-6 py-3" />
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Mijoz</th>
                    <th className="px-6 py-3">Ustaxona</th>
                    <th className="px-6 py-3">Xizmat</th>
                    <th className="px-6 py-3">Yuborilgan</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((claim) => {
                    const statusCfg =
                      claimStatusConfig[claim.status] ??
                      claimStatusConfig.submitted;
                    const isExpanded = expandedId === claim.id;

                    return (
                      <React.Fragment key={claim.id}>
                        <tr className="transition-colors hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleExpand(claim.id)}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {claim.id}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">
                              {claim.customer_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {claim.customer_phone}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {claim.workshop_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {claim.service_name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {claim.submitted_at}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={statusCfg.variant}>
                              {statusCfg.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {(claim.status === 'submitted' ||
                              claim.status === 'reviewing') && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 text-white hover:bg-green-700"
                                  icon={
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  }
                                  loading={approveMutation.isPending}
                                  onClick={() =>
                                    approveMutation.mutate(claim.id)
                                  }
                                >
                                  Tasdiqlash
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  icon={<XCircle className="h-3.5 w-3.5" />}
                                  onClick={() => openRejectModal(claim)}
                                >
                                  Rad etish
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Detail Row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="bg-gray-50 px-6 py-4">
                              <div className="ml-10 space-y-2">
                                <div>
                                  <p className="text-xs font-medium text-gray-500">
                                    Ariza matni
                                  </p>
                                  <p className="mt-1 text-sm text-gray-700">
                                    {claim.description}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500">
                                    Buyurtma raqami
                                  </p>
                                  <p className="mt-1 text-sm font-medium text-blue-600">
                                    #{claim.booking_id}
                                  </p>
                                </div>
                                {claim.reject_reason && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">
                                      Rad etish sababi
                                    </p>
                                    <p className="mt-1 text-sm text-red-600">
                                      {claim.reject_reason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <p className="text-sm text-gray-500">
                  Jami: {data.total} ta ariza
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<ChevronLeft className="h-4 w-4" />}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  />
                  <span className="text-sm text-gray-700">
                    {page} / {data.pages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<ChevronRight className="h-4 w-4" />}
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject Modal */}
      <Modal
        open={rejectModal}
        onOpenChange={setRejectModal}
        title="Arizani rad etish"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            #{targetClaim?.id} raqamli arizani rad etish uchun sabab kiriting:
          </p>
          <textarea
            className="flex min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400"
            placeholder="Rad etish sababi..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setRejectModal(false)}
            >
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              loading={rejectMutation.isPending}
              disabled={!rejectReason.trim()}
              onClick={() =>
                targetClaim &&
                rejectMutation.mutate({
                  id: targetClaim.id,
                  reason: rejectReason,
                })
              }
            >
              Rad etish
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default AdminWarrantyClaimsPage;
