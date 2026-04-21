import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowUpCircle,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import api from '@/shared/api/axios';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Modal } from '@/shared/components/Modal';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';
import { toast } from 'sonner';

interface Complaint {
  id: number;
  subject: string;
  description: string;
  complainant_name: string;
  complainant_phone: string;
  type: 'service' | 'payment' | 'behavior' | 'quality' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'escalated' | 'closed';
  assigned_to?: string;
  against_name?: string;
  booking_reference?: string;
  created_at: string;
  resolution_thread?: ResolutionMessage[];
}

interface ResolutionMessage {
  id: number;
  author: string;
  message: string;
  created_at: string;
}

interface ComplaintsResponse {
  items: Complaint[];
  total: number;
  page: number;
  pages: number;
  stats: {
    open: number;
    in_progress: number;
    resolved: number;
    escalated: number;
  };
}

interface AdminUser {
  id: number;
  full_name: string;
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'escalated' | 'closed';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Barchasi' },
  { value: 'open', label: 'Ochiq' },
  { value: 'in_progress', label: 'Jarayonda' },
  { value: 'resolved', label: 'Hal qilingan' },
  { value: 'escalated', label: 'Kuchaytirilgan' },
  { value: 'closed', label: 'Yopilgan' },
];

const priorityChips: { value: PriorityFilter; label: string; color: string }[] = [
  { value: 'all', label: 'Barchasi', color: 'bg-gray-100 text-gray-700' },
  { value: 'low', label: 'Past', color: 'bg-blue-100 text-blue-700' },
  { value: 'medium', label: "O'rta", color: 'bg-yellow-100 text-yellow-700' },
  { value: 'high', label: 'Yuqori', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Kritik', color: 'bg-red-100 text-red-700' },
];

const typeLabels: Record<string, string> = {
  service: 'Xizmat',
  payment: "To'lov",
  behavior: 'Xulq',
  quality: 'Sifat',
  other: 'Boshqa',
};

const typeBadgeVariant = (type: string) => {
  switch (type) {
    case 'service': return 'primary' as const;
    case 'payment': return 'warning' as const;
    case 'behavior': return 'danger' as const;
    case 'quality': return 'info' as const;
    default: return 'default' as const;
  }
};

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'open': return 'danger' as const;
    case 'in_progress': return 'warning' as const;
    case 'resolved': return 'success' as const;
    case 'escalated': return 'info' as const;
    case 'closed': return 'default' as const;
    default: return 'default' as const;
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'open': return 'Ochiq';
    case 'in_progress': return 'Jarayonda';
    case 'resolved': return 'Hal qilingan';
    case 'escalated': return 'Kuchaytirilgan';
    case 'closed': return 'Yopilgan';
    default: return status;
  }
};

const priorityBadgeVariant = (priority: string) => {
  switch (priority) {
    case 'low': return 'primary' as const;
    case 'medium': return 'warning' as const;
    case 'high': return 'danger' as const;
    case 'critical': return 'danger' as const;
    default: return 'default' as const;
  }
};

const priorityLabel = (priority: string) => {
  switch (priority) {
    case 'low': return 'Past';
    case 'medium': return "O'rta";
    case 'high': return 'Yuqori';
    case 'critical': return 'Kritik';
    default: return priority;
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const AdminComplaintsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [page, setPage] = useState(1);
  const [detailModal, setDetailModal] = useState(false);
  const [resolveModal, setResolveModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [resolution, setResolution] = useState('');

  // New complaint form state
  const [newComplaint, setNewComplaint] = useState({
    subject: '',
    type: 'service' as Complaint['type'],
    description: '',
    priority: 'medium' as Complaint['priority'],
    against_name: '',
  });

  const { data, isLoading } = useQuery<ComplaintsResponse>({
    queryKey: ['admin-complaints', { search, statusFilter, priorityFilter, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      const { data } = await api.get('/admin/complaints', { params }).catch((err) => {
        toast.error('Shikoyatlarni yuklashda xatolik');
        throw err;
      });
      return data;
    },
  });

  const { data: admins } = useQuery<AdminUser[]>({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const { data } = await api.get('/admin/admins').catch((err) => {
        toast.error('Adminlarni yuklashda xatolik');
        throw err;
      });
      return data?.items ?? data;
    },
  });

  const resolveComplaint = useMutation({
    mutationFn: async ({ id, resolution }: { id: number; resolution: string }) => {
      await api.patch(`/admin/complaints/${id}/resolve`, { resolution });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
      setResolveModal(false);
      setResolution('');
      toast.success('Shikoyat hal qilindi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const escalateComplaint = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/admin/complaints/${id}/escalate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
      toast.success('Shikoyat kuchaytirildi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const closeComplaint = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/admin/complaints/${id}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
      setDetailModal(false);
      toast.success('Shikoyat yopildi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const assignComplaint = useMutation({
    mutationFn: async ({ id, assigned_to }: { id: number; assigned_to: number }) => {
      await api.patch(`/admin/complaints/${id}/assign`, { assigned_to });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
      setAssignModal(false);
      toast.success('Shikoyat tayinlandi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const createComplaintMutation = useMutation({
    mutationFn: async (data: typeof newComplaint) => {
      await api.post('/admin/complaints', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
      setCreateModal(false);
      setNewComplaint({ subject: '', type: 'service', description: '', priority: 'medium', against_name: '' });
      toast.success('Shikoyat yaratildi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const stats = data?.stats ?? { open: 0, in_progress: 0, resolved: 0, escalated: 0 };

  const statCards = [
    { label: 'Ochiq', value: stats.open, icon: <AlertCircle className="h-5 w-5" />, color: 'from-red-500 to-red-600' },
    { label: 'Jarayonda', value: stats.in_progress, icon: <Clock className="h-5 w-5" />, color: 'from-yellow-500 to-yellow-600' },
    { label: 'Hal qilingan', value: stats.resolved, icon: <CheckCircle2 className="h-5 w-5" />, color: 'from-green-500 to-green-600' },
    { label: 'Kuchaytirilgan', value: stats.escalated, icon: <ArrowUpCircle className="h-5 w-5" />, color: 'from-purple-500 to-purple-600' },
  ];

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shikoyatlar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Shikoyatlarni boshqaring va hal qiling
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setCreateModal(true)}
        >
          Yangi shikoyat
        </Button>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        variants={containerVariants}
      >
        {statCards.map((card, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            className={cn(
              'relative overflow-hidden rounded-xl bg-gradient-to-br p-5 text-white shadow-lg',
              card.color
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">{card.label}</p>
                <p className="mt-1 text-3xl font-bold">{card.value}</p>
              </div>
              <div className="rounded-lg bg-white/20 p-2">{card.icon}</div>
            </div>
            <div className="absolute -bottom-3 -right-3 h-16 w-16 rounded-full bg-white/10" />
          </motion.div>
        ))}
      </motion.div>

      {/* Status Tabs */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              statusFilter === tab.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Priority Filter + Search */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Mavzu yoki shikoyatchi..."
            iconLeft={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {priorityChips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => { setPriorityFilter(chip.value); setPage(1); }}
              className={cn(
                'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                priorityFilter === chip.value
                  ? cn(chip.color, 'ring-2 ring-offset-1 ring-gray-300')
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-gray-100 bg-white shadow-sm"
      >
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" label="Yuklanmoqda..." />
          </div>
        ) : !data?.items?.length ? (
          <EmptyState
            icon={<MessageSquare className="h-8 w-8" />}
            title="Shikoyatlar topilmadi"
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Mavzu</th>
                    <th className="px-6 py-3">Shikoyatchi</th>
                    <th className="px-6 py-3">Tur</th>
                    <th className="px-6 py-3">Muhimlik</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Tayinlangan</th>
                    <th className="px-6 py-3">Sana</th>
                    <th className="px-6 py-3">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((complaint) => (
                    <tr
                      key={complaint.id}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-gray-50',
                        complaint.priority === 'critical' && 'bg-red-50/30'
                      )}
                      onClick={() => { setSelectedComplaint(complaint); setDetailModal(true); }}
                    >
                      <td className="px-6 py-4 text-sm font-mono text-gray-500">
                        #{complaint.id}
                      </td>
                      <td className="max-w-[200px] px-6 py-4">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {complaint.subject}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {complaint.complainant_name}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={typeBadgeVariant(complaint.type)}>
                          {typeLabels[complaint.type] ?? complaint.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={priorityBadgeVariant(complaint.priority)} size="sm">
                          {priorityLabel(complaint.priority)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusBadgeVariant(complaint.status)}>
                          {statusLabel(complaint.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {complaint.assigned_to ?? '---'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {complaint.created_at}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<UserPlus className="h-3.5 w-3.5" />}
                            onClick={() => { setSelectedComplaint(complaint); setAssignModal(true); }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                            onClick={() => { setSelectedComplaint(complaint); setResolveModal(true); }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<ArrowUpCircle className="h-3.5 w-3.5 text-purple-600" />}
                            onClick={() => complaint.id && escalateComplaint.mutate(complaint.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 p-4 md:hidden">
              {data.items.map((complaint) => (
                <div
                  key={complaint.id}
                  className={cn(
                    'rounded-lg border border-gray-100 p-4 cursor-pointer',
                    complaint.priority === 'critical' && 'border-red-200 bg-red-50/30'
                  )}
                  onClick={() => { setSelectedComplaint(complaint); setDetailModal(true); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {complaint.subject}
                      </p>
                      <p className="text-sm text-gray-500">
                        #{complaint.id} - {complaint.complainant_name}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant(complaint.status)} size="sm">
                      {statusLabel(complaint.status)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={typeBadgeVariant(complaint.type)} size="sm">
                      {typeLabels[complaint.type]}
                    </Badge>
                    <Badge variant={priorityBadgeVariant(complaint.priority)} size="sm">
                      {priorityLabel(complaint.priority)}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">{complaint.created_at}</div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <p className="text-sm text-gray-500">Jami: {data.total} ta shikoyat</p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<ChevronLeft className="h-4 w-4" />}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  />
                  <span className="text-sm text-gray-700">{page} / {data.pages}</span>
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
      </motion.div>

      {/* Complaint Detail Modal */}
      <Modal
        open={detailModal}
        onOpenChange={setDetailModal}
        title={`Shikoyat #${selectedComplaint?.id ?? ''}`}
        size="lg"
      >
        {selectedComplaint && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase">Mavzu</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{selectedComplaint.subject}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase">Shikoyatchi</p>
                <p className="mt-1 text-sm text-gray-700">{selectedComplaint.complainant_name}</p>
                <p className="text-xs text-gray-500">{selectedComplaint.complainant_phone}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase">Tur</p>
                <Badge variant={typeBadgeVariant(selectedComplaint.type)} className="mt-1">
                  {typeLabels[selectedComplaint.type]}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase">Muhimlik</p>
                <Badge variant={priorityBadgeVariant(selectedComplaint.priority)} className="mt-1">
                  {priorityLabel(selectedComplaint.priority)}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase">Status</p>
                <Badge variant={statusBadgeVariant(selectedComplaint.status)} className="mt-1">
                  {statusLabel(selectedComplaint.status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase">Tayinlangan</p>
                <p className="mt-1 text-sm text-gray-700">{selectedComplaint.assigned_to ?? 'Tayinlanmagan'}</p>
              </div>
              {selectedComplaint.booking_reference && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase">Buyurtma raqami</p>
                  <p className="mt-1 text-sm font-mono text-blue-600">{selectedComplaint.booking_reference}</p>
                </div>
              )}
              {selectedComplaint.against_name && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase">Kimga qarshi</p>
                  <p className="mt-1 text-sm text-gray-700">{selectedComplaint.against_name}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-2">Tavsif</p>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedComplaint.description}</p>
              </div>
            </div>

            {/* Resolution Thread (read-only) */}
            {selectedComplaint.resolution_thread && selectedComplaint.resolution_thread.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase mb-3">Yozishmalar</p>
                <div className="space-y-3">
                  {selectedComplaint.resolution_thread.map((msg) => (
                    <div key={msg.id} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{msg.author}</p>
                        <span className="text-xs text-gray-400">{msg.created_at}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{msg.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
              <Button
                variant="secondary"
                icon={<UserPlus className="h-4 w-4" />}
                onClick={() => { setDetailModal(false); setAssignModal(true); }}
              >
                Tayinlash
              </Button>
              <Button
                variant="outline"
                icon={<ArrowUpCircle className="h-4 w-4" />}
                onClick={() => escalateComplaint.mutate(selectedComplaint.id)}
              >
                Kuchaytirish
              </Button>
              <Button
                variant="primary"
                icon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => { setDetailModal(false); setResolveModal(true); }}
              >
                Hal qilish
              </Button>
              <Button
                variant="danger"
                icon={<XCircle className="h-4 w-4" />}
                loading={closeComplaint.isPending}
                onClick={() => closeComplaint.mutate(selectedComplaint.id)}
              >
                Yopish
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Resolve Modal */}
      <Modal
        open={resolveModal}
        onOpenChange={setResolveModal}
        title="Shikoyatni hal qilish"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Shikoyat #{selectedComplaint?.id} ni hal qilish uchun yechimni kiriting.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Yechim
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Yechimni batafsil yozing..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setResolveModal(false); setResolution(''); }}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              loading={resolveComplaint.isPending}
              disabled={!resolution.trim()}
              onClick={() =>
                selectedComplaint && resolveComplaint.mutate({ id: selectedComplaint.id, resolution })
              }
            >
              Hal qilish
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal
        open={assignModal}
        onOpenChange={setAssignModal}
        title="Shikoyatni tayinlash"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Shikoyat #{selectedComplaint?.id} ni kimga tayinlash kerak?
          </p>
          <div className="space-y-2">
            {admins?.map((admin) => (
              <button
                key={admin.id}
                className="w-full rounded-lg border border-gray-200 p-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-blue-50 hover:border-blue-300"
                onClick={() =>
                  selectedComplaint && assignComplaint.mutate({ id: selectedComplaint.id, assigned_to: admin.id })
                }
              >
                {admin.full_name}
              </button>
            )) ?? <p className="text-sm text-gray-400">Admin topilmadi</p>}
          </div>
        </div>
      </Modal>

      {/* Create Complaint Modal */}
      <Modal
        open={createModal}
        onOpenChange={setCreateModal}
        title="Yangi shikoyat"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Mavzu</label>
            <Input
              placeholder="Shikoyat mavzusi..."
              value={newComplaint.subject}
              onChange={(e) => setNewComplaint({ ...newComplaint, subject: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Tur</label>
              <select
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newComplaint.type}
                onChange={(e) => setNewComplaint({ ...newComplaint, type: e.target.value as Complaint['type'] })}
              >
                <option value="service">Xizmat</option>
                <option value="payment">To'lov</option>
                <option value="behavior">Xulq</option>
                <option value="quality">Sifat</option>
                <option value="other">Boshqa</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Muhimlik</label>
              <select
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newComplaint.priority}
                onChange={(e) => setNewComplaint({ ...newComplaint, priority: e.target.value as Complaint['priority'] })}
              >
                <option value="low">Past</option>
                <option value="medium">O'rta</option>
                <option value="high">Yuqori</option>
                <option value="critical">Kritik</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Kimga qarshi</label>
            <Input
              placeholder="Foydalanuvchi yoki ustaxona nomi..."
              value={newComplaint.against_name}
              onChange={(e) => setNewComplaint({ ...newComplaint, against_name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Tavsif</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Shikoyat tavsifi..."
              value={newComplaint.description}
              onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              Bekor qilish
            </Button>
            <Button
              loading={createComplaintMutation.isPending}
              disabled={!newComplaint.subject.trim() || !newComplaint.description.trim()}
              onClick={() => createComplaintMutation.mutate(newComplaint)}
            >
              Yaratish
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default AdminComplaintsPage;
