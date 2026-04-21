import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  CalendarCheck,
  DollarSign,
  MessageSquare,
  Wallet,
  Car,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldBan,
  Clock,
  Gauge,
  Palette,
  UserPlus,
} from 'lucide-react';
import api from '@/shared/api/axios';
import { cn, formatPrice, formatPhone } from '@/shared/lib/utils';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Modal } from '@/shared/components/Modal';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';
import { Avatar } from '@/shared/components/Avatar';
import { StarRating } from '@/shared/components/StarRating';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

interface User {
  id: number;
  phone: string;
  full_name: string;
  email?: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string | null;
  region?: string;
  created_at: string;
}

interface UsersResponse {
  items: User[];
  total: number;
  skip: number;
  limit: number;
}

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  mileage: number;
}

interface UserStats {
  bookings_count: number;
  total_paid: number;
  reviews_count: number;
  cashback_balance: number;
  cashback_tier: string;
  cashback_earned: number;
}

interface UserBooking {
  id: number;
  workshop_name: string;
  status: string;
  total_price: number;
  notes?: string;
  scheduled_at: string;
}

interface UserReview {
  id: number;
  workshop_name: string;
  rating_overall: number;
  comment: string;
  created_at: string;
}

interface UserDetail {
  user: User;
  vehicles: Vehicle[];
  stats: UserStats;
  bookings: UserBooking[];
  reviews: UserReview[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

type RoleFilter = '' | 'customer' | 'partner' | 'admin';
type StatusFilter = '' | 'active' | 'blocked';

const ROLE_CHIPS: { value: RoleFilter; label: string }[] = [
  { value: '', label: 'Barchasi' },
  { value: 'customer', label: 'Mijozlar' },
  { value: 'partner', label: 'Partnerlar' },
  { value: 'admin', label: 'Adminlar' },
];

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'Barchasi' },
  { value: 'active', label: 'Faol' },
  { value: 'blocked', label: 'Bloklangan' },
];

const LIMIT = 20;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRoleBadge(role: string) {
  if (role === 'customer') return { label: 'Mijoz', variant: 'primary' as const };
  if (role === 'partner') return { label: 'Partner', variant: 'success' as const };
  return { label: 'Admin', variant: 'info' as const };
}

function getStatusBadge(isActive: boolean) {
  return isActive
    ? { label: 'Faol', variant: 'success' as const }
    : { label: 'Bloklangan', variant: 'danger' as const };
}

function getBookingStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'danger' | 'default' | 'info' }> = {
    pending: { label: 'Kutilmoqda', variant: 'warning' },
    confirmed: { label: 'Tasdiqlangan', variant: 'primary' },
    in_progress: { label: 'Jarayonda', variant: 'info' },
    completed: { label: 'Yakunlangan', variant: 'success' },
    cancelled: { label: 'Bekor qilingan', variant: 'danger' },
  };
  return map[status] || { label: status, variant: 'default' as const };
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);

  const [detailModal, setDetailModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('customer');

  const skip = (page - 1) * LIMIT;

  // ── Users list query ───────────────────────────────────────────────────────

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['admin-users', { search, roleFilter, statusFilter, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { skip, limit: LIMIT };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get('/admin/users', { params });
      return data;
    },
    placeholderData: (prev) => prev,
  });

  const users = useMemo(() => {
    let items = data?.items ?? [];
    if (statusFilter === 'active') items = items.filter((u) => u.is_active);
    if (statusFilter === 'blocked') items = items.filter((u) => !u.is_active);
    return items;
  }, [data, statusFilter]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // ── User detail query ──────────────────────────────────────────────────────

  const { data: detail, isLoading: detailLoading } = useQuery<UserDetail>({
    queryKey: ['admin-user-detail', selectedUserId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/users/${selectedUserId}`);
      return data;
    },
    enabled: !!selectedUserId && detailModal,
  });

  // ── Block / Unblock mutation ───────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/admin/users', { phone: newPhone.startsWith('+') ? newPhone : `+998${newPhone}`, full_name: newName, role: newRole });
    },
    onSuccess: () => {
      toast.success('Foydalanuvchi yaratildi');
      setCreateOpen(false);
      setNewPhone(''); setNewName(''); setNewRole('customer');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail?.message || 'Xatolik yuz berdi'),
  });

  const blockMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      await api.patch(`/admin/users/${id}/block`, { is_active });
    },
    onSuccess: (_, variables) => {
      toast.success(variables.is_active ? 'Foydalanuvchi faollashtirildi' : 'Foydalanuvchi bloklandi');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', variables.id] });
    },
    onError: () => {
      toast.error('Amalda xatolik yuz berdi');
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openDetail = (userId: number) => {
    setSelectedUserId(userId);
    setDetailModal(true);
  };

  const handleBlock = (id: number, currentActive: boolean, e?: React.MouseEvent) => {
    e?.stopPropagation();
    blockMutation.mutate({ id, is_active: !currentActive });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Foydalanuvchilar</h1>
            <p className="text-sm text-gray-500">
              Jami: {total.toLocaleString()} ta foydalanuvchi
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<UserPlus className="h-4 w-4" />}
          className="bg-emerald-600 hover:bg-emerald-700">
          Yangi foydalanuvchi
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
      >
        <Input
          placeholder="Ism yoki telefon bo'yicha qidirish..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          iconLeft={<Search className="h-4 w-4" />}
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rol:</span>
          {ROLE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => { setRoleFilter(chip.value); setPage(1); }}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                roleFilter === chip.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Holat:</span>
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => { setStatusFilter(chip.value); setPage(1); }}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                statusFilter === chip.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" label="Yuklanmoqda..." />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Foydalanuvchilar topilmadi"
          description="Qidiruv so'rovingiz bo'yicha natija topilmadi"
        />
      ) : (
        <>
          {/* Desktop Table */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="hidden overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100 md:block"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Foydalanuvchi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Telefon
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Holat
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Sana
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => {
                  const role = getRoleBadge(user.role);
                  const status = getStatusBadge(user.is_active);
                  return (
                    <motion.tr
                      key={user.id}
                      variants={itemVariants}
                      onClick={() => openDetail(user.id)}
                      className="cursor-pointer transition-colors hover:bg-gray-50/80"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={user.avatar_url}
                            name={user.full_name || '?'}
                            size="sm"
                          />
                          <span className="font-medium text-gray-900 truncate max-w-[200px]">
                            {user.full_name || 'Nomsiz'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatPhone(user.phone)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={role.variant} size="sm">{role.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant} size="sm">{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant={user.is_active ? 'danger' : 'primary'}
                          onClick={(e) => handleBlock(user.id, user.is_active, e)}
                          loading={blockMutation.isPending && blockMutation.variables?.id === user.id}
                        >
                          {user.is_active ? 'Bloklash' : 'Faollashtirish'}
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          {/* Mobile Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-3 md:hidden"
          >
            {users.map((user) => {
              const role = getRoleBadge(user.role);
              const status = getStatusBadge(user.is_active);
              return (
                <motion.div
                  key={user.id}
                  variants={itemVariants}
                  onClick={() => openDetail(user.id)}
                  className="cursor-pointer rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={user.avatar_url}
                        name={user.full_name || '?'}
                        size="md"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {user.full_name || 'Nomsiz'}
                        </p>
                        <p className="text-sm text-gray-500">{formatPhone(user.phone)}</p>
                      </div>
                    </div>
                    <Badge variant={status.variant} size="sm">{status.label}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant={role.variant} size="sm">{role.label}</Badge>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(user.created_at)}</span>
                  </div>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant={user.is_active ? 'danger' : 'primary'}
                      fullWidth
                      onClick={(e) => handleBlock(user.id, user.is_active, e)}
                      loading={blockMutation.isPending && blockMutation.variables?.id === user.id}
                    >
                      {user.is_active ? 'Bloklash' : 'Faollashtirish'}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6 flex items-center justify-center gap-2"
            >
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Oldingi
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('dots');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === 'dots' ? (
                      <span key={`dots-${idx}`} className="px-1 text-gray-400">...</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item)}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all',
                          page === item
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        {item}
                      </button>
                    )
                  )}
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                iconRight={<ChevronRight className="h-4 w-4" />}
              >
                Keyingi
              </Button>
            </motion.div>
          )}
        </>
      )}

      {/* ── User Detail Modal ──────────────────────────────────────────────── */}
      <Modal
        open={detailModal}
        onOpenChange={setDetailModal}
        size="lg"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <AnimatePresence mode="wait">
          {detailLoading || !detail ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-16"
            >
              <LoadingSpinner size="lg" label="Ma'lumotlar yuklanmoqda..." />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Top Section */}
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Avatar
                  src={detail.user.avatar_url}
                  name={detail.user.full_name || '?'}
                  size="xl"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900">
                    {detail.user.full_name || 'Nomsiz'}
                  </h2>

                  <div className="mt-2 space-y-1">
                    <a
                      href={`tel:${detail.user.phone}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      {formatPhone(detail.user.phone)}
                    </a>
                    {detail.user.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4 shrink-0" />
                        {detail.user.email}
                      </div>
                    )}
                    {detail.user.region && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 shrink-0" />
                        {detail.user.region}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant={getRoleBadge(detail.user.role).variant}>
                      {getRoleBadge(detail.user.role).label}
                    </Badge>
                    <Badge variant={getStatusBadge(detail.user.is_active).variant}>
                      {getStatusBadge(detail.user.is_active).label}
                    </Badge>
                    {detail.user.is_verified && (
                      <Badge variant="success" className="gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Tasdiqlangan
                      </Badge>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-gray-400">
                    A'zo bo'lgan sana: {formatDate(detail.user.created_at)}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant={detail.user.is_active ? 'danger' : 'primary'}
                  icon={detail.user.is_active ? <ShieldBan className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  onClick={() => handleBlock(detail.user.id, detail.user.is_active)}
                  loading={blockMutation.isPending && blockMutation.variables?.id === detail.user.id}
                >
                  {detail.user.is_active ? 'Bloklash' : 'Faollashtirish'}
                </Button>
              </div>

              <hr className="border-gray-100" />

              {/* Statistics Cards */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Statistika
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard
                    icon={<CalendarCheck className="h-5 w-5" />}
                    label="Buyurtmalar soni"
                    value={String(detail.stats.bookings_count ?? 0)}
                    color="blue"
                  />
                  <StatCard
                    icon={<DollarSign className="h-5 w-5" />}
                    label="Jami to'lovlar"
                    value={formatPrice(detail.stats.total_paid ?? 0)}
                    color="emerald"
                  />
                  <StatCard
                    icon={<MessageSquare className="h-5 w-5" />}
                    label="Sharhlar soni"
                    value={String(detail.stats.reviews_count ?? 0)}
                    color="amber"
                  />
                  <StatCard
                    icon={<Wallet className="h-5 w-5" />}
                    label="Cashback balans"
                    value={formatPrice(detail.stats.cashback_balance ?? 0)}
                    color="purple"
                    extra={
                      detail.stats.cashback_tier ? (
                        <span className="mt-1 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                          {detail.stats.cashback_tier}
                        </span>
                      ) : null
                    }
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Vehicles */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Mashinalar
                </h3>
                {detail.vehicles.length === 0 ? (
                  <div className="rounded-lg bg-gray-50 py-6 text-center text-sm text-gray-400">
                    Mashinalar yo'q
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {detail.vehicles.map((v) => (
                      <motion.div
                        key={v.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Car className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">
                            {v.brand} {v.model}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {v.year}
                            </span>
                            <span className="font-mono bg-gray-200 rounded px-1.5 py-0.5 text-gray-700">
                              {v.plate}
                            </span>
                            {v.color && (
                              <span className="flex items-center gap-1">
                                <Palette className="h-3 w-3" />
                                {v.color}
                              </span>
                            )}
                            {v.mileage != null && (
                              <span className="flex items-center gap-1">
                                <Gauge className="h-3 w-3" />
                                {v.mileage.toLocaleString()} km
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Bookings */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Buyurtmalar tarixi
                </h3>
                {(detail.bookings?.length ?? 0) === 0 ? (
                  <div className="rounded-lg bg-gray-50 py-6 text-center text-sm text-gray-400">
                    Buyurtmalar yo'q
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detail.bookings.slice(0, 10).map((b) => {
                      const bs = getBookingStatusBadge(b.status);
                      return (
                        <motion.div
                          key={b.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">
                              {b.workshop_name}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatDateTime(b.scheduled_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant={bs.variant} size="sm">{bs.label}</Badge>
                            <span className="text-sm font-semibold text-gray-700">
                              {formatPrice(b.total_price ?? 0)}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Reviews */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Sharhlar
                </h3>
                {(detail.reviews?.length ?? 0) === 0 ? (
                  <div className="rounded-lg bg-gray-50 py-6 text-center text-sm text-gray-400">
                    Sharhlar yo'q
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detail.reviews.map((r) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-lg border border-gray-100 bg-gray-50/50 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{r.workshop_name}</p>
                          <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
                        </div>
                        <div className="mt-1">
                          <StarRating value={r.rating_overall ?? 0} size="sm" showValue />
                        </div>
                        {r.comment && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                            {r.comment}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>

      {/* Create User Modal */}
      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Yangi foydalanuvchi" size="md">
        <div className="space-y-4">
          <Input label="Telefon raqam" placeholder="+998901234567" value={newPhone}
            onChange={e => setNewPhone(e.target.value)} iconLeft={<Phone className="h-4 w-4" />} />
          <Input label="To'liq ism" placeholder="Ism Familiya" value={newName}
            onChange={e => setNewName(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Rol</label>
            <div className="flex gap-3">
              {[
                { value: 'customer', label: 'Mijoz', icon: '👤', desc: 'Xizmatlardan foydalanuvchi' },
                { value: 'partner', label: 'Ustaxona egasi', icon: '🔧', desc: 'Ustaxona boshqaruvchisi' },
              ].map(r => (
                <button key={r.value} onClick={() => setNewRole(r.value)}
                  className={cn('flex-1 rounded-xl border-2 p-4 text-left transition-all',
                    newRole === r.value ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <span className="text-2xl">{r.icon}</span>
                  <p className="text-sm font-bold text-gray-900 mt-1">{r.label}</p>
                  <p className="text-[11px] text-gray-500">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <Button fullWidth loading={createMutation.isPending}
            disabled={!newPhone || !newName}
            onClick={() => createMutation.mutate()}
            icon={<UserPlus className="h-4 w-4" />}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Yaratish
          </Button>
        </div>
      </Modal>
    </div>
  );
};

// ── Stat Card Component ────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
  extra?: React.ReactNode;
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    icon: 'bg-blue-100 text-blue-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    icon: 'bg-emerald-100 text-emerald-600',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    icon: 'bg-amber-100 text-amber-600',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    icon: 'bg-purple-100 text-purple-600',
  },
};

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, extra }) => {
  const c = colorMap[color];
  return (
    <div className={cn('rounded-xl p-3', c.bg)}>
      <div className={cn('mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg', c.icon)}>
        {icon}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('text-lg font-bold', c.text)}>{value}</p>
      {extra}
    </div>
  );
};

export default AdminUsersPage;
