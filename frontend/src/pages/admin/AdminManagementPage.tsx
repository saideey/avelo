import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Shield,
  ShieldOff,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  Search,
  Crown,
  MapPin,
  UserCog,
} from 'lucide-react';
import api from '@/shared/api/axios';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Modal } from '@/shared/components/Modal';
import { Avatar } from '@/shared/components/Avatar';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';
import { toast } from 'sonner';

interface AdminUser {
  id: number;
  full_name: string;
  phone: string;
  role: 'super_admin' | 'regional_admin' | 'moderator' | 'admin';
  region?: string;
  is_active: boolean;
  created_at?: string;
  avatar_url?: string;
}

interface AdminsResponse {
  items: AdminUser[];
  total: number;
  page: number;
  pages: number;
}

const roleConfig: Record<string, { label: string; variant: 'primary' | 'success' | 'default'; className?: string; icon: React.ReactNode }> = {
  super_admin: { label: 'Super Admin', variant: 'default', className: 'bg-purple-100 text-purple-700', icon: <Crown className="h-3 w-3" /> },
  regional_admin: { label: 'Regional', variant: 'primary', icon: <MapPin className="h-3 w-3" /> },
  moderator: { label: 'Moderator', variant: 'success', icon: <UserCog className="h-3 w-3" /> },
  admin: { label: 'Admin', variant: 'default', icon: <Shield className="h-3 w-3" /> },
};

const regions = [
  'Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Farg\'ona',
  'Namangan', 'Xorazm', 'Qashqadaryo', 'Surxondaryo', 'Jizzax',
  'Sirdaryo', 'Navoiy', 'Qoraqalpog\'iston',
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const AdminManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createModal, setCreateModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  const [newAdmin, setNewAdmin] = useState({
    phone: '',
    full_name: '',
    role: 'admin' as AdminUser['role'],
    region: '',
  });

  const [newRole, setNewRole] = useState<AdminUser['role']>('admin');

  const { data, isLoading } = useQuery<AdminsResponse>({
    queryKey: ['admin-management', { search, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (search) params.search = search;
      const { data } = await api.get('/admin/admins', { params });
      return data;
    },
  });

  const createAdmin = useMutation({
    mutationFn: async (data: typeof newAdmin) => {
      await api.post('/admin/admins', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-management'] });
      setCreateModal(false);
      setNewAdmin({ phone: '', full_name: '', role: 'admin', region: '' });
      toast.success('Admin muvaffaqiyatli yaratildi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ id }: { id: number; block: boolean }) => {
      await api.patch(`/admin/admins/${id}/block`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-management'] });
      setConfirmModal(false);
      setSelectedAdmin(null);
      toast.success('Status yangilandi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      await api.patch(`/admin/admins/${id}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-management'] });
      setRoleModal(false);
      setSelectedAdmin(null);
      toast.success('Rol yangilandi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const deleteAdmin = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/admins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-management'] });
      setDeleteModal(false);
      setSelectedAdmin(null);
      toast.success('Admin o\'chirildi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adminlar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Admin foydalanuvchilarni boshqaring (faqat Super Admin)
          </p>
        </div>
        <Button
          icon={<UserPlus className="h-4 w-4" />}
          onClick={() => setCreateModal(true)}
        >
          Yangi admin
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <Input
          placeholder="Ism yoki telefon..."
          iconLeft={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
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
            icon={<Users className="h-8 w-8" />}
            title="Adminlar topilmadi"
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Admin</th>
                    <th className="px-6 py-3">Telefon</th>
                    <th className="px-6 py-3">Rol</th>
                    <th className="px-6 py-3">Hudud</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Yaratilgan</th>
                    <th className="px-6 py-3">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((admin) => {
                    const config = roleConfig[admin.role] ?? roleConfig.moderator;
                    return (
                      <tr key={admin.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={admin.avatar_url}
                              name={admin.full_name}
                              size="sm"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {admin.full_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {admin.phone}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={config.variant} className={cn("inline-flex items-center gap-1", config.className)}>
                            {config.icon}
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {admin.region ?? '---'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={admin.is_active ? 'success' : 'danger'}>
                            {admin.is_active ? 'Faol' : 'Bloklangan'}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {admin.created_at ?? '---'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<UserCog className="h-3.5 w-3.5" />}
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setNewRole(admin.role);
                                setRoleModal(true);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={admin.is_active
                                ? <ShieldOff className="h-3.5 w-3.5 text-red-500" />
                                : <Shield className="h-3.5 w-3.5 text-green-500" />
                              }
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setConfirmModal(true);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />}
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setDeleteModal(true);
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 p-4 md:hidden">
              {data.items.map((admin) => {
                const config = roleConfig[admin.role] ?? roleConfig.moderator;
                return (
                  <div key={admin.id} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={admin.avatar_url} name={admin.full_name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{admin.full_name}</p>
                        <p className="text-sm text-gray-500">{admin.phone}</p>
                      </div>
                      <Badge variant={config.variant} size="sm" className={config.className}>
                        {config.label}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={admin.is_active ? 'success' : 'danger'} size="sm">
                          {admin.is_active ? 'Faol' : 'Bloklangan'}
                        </Badge>
                        {admin.region && (
                          <span className="text-xs text-gray-400">{admin.region}</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<UserCog className="h-3.5 w-3.5" />}
                          onClick={() => { setSelectedAdmin(admin); setNewRole(admin.role); setRoleModal(true); }}
                        />
                        <Button
                          size="sm"
                          variant={admin.is_active ? 'danger' : 'primary'}
                          onClick={() => { setSelectedAdmin(admin); setConfirmModal(true); }}
                        >
                          {admin.is_active ? 'Bloklash' : 'Ochish'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <p className="text-sm text-gray-500">Jami: {data.total} ta admin</p>
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

      {/* Create Admin Modal */}
      <Modal
        open={createModal}
        onOpenChange={setCreateModal}
        title="Yangi admin yaratish"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Telefon raqam</label>
            <Input
              placeholder="+998 90 123 45 67"
              value={newAdmin.phone}
              onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">To'liq ism</label>
            <Input
              placeholder="Ism familiya..."
              value={newAdmin.full_name}
              onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Rol</label>
            <select
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newAdmin.role}
              onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value as AdminUser['role'] })}
            >
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="regional_admin">Regional Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          {newAdmin.role === 'regional_admin' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Hudud</label>
              <select
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newAdmin.region}
                onChange={(e) => setNewAdmin({ ...newAdmin, region: e.target.value })}
              >
                <option value="">Tanlang...</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              Bekor qilish
            </Button>
            <Button
              loading={createAdmin.isPending}
              disabled={!newAdmin.phone.trim() || !newAdmin.full_name.trim()}
              onClick={() => createAdmin.mutate(newAdmin)}
            >
              Yaratish
            </Button>
          </div>
        </div>
      </Modal>

      {/* Block/Unblock Confirm Modal */}
      <Modal
        open={confirmModal}
        onOpenChange={setConfirmModal}
        title={selectedAdmin?.is_active ? 'Adminni bloklash' : 'Blokdan chiqarish'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {selectedAdmin?.is_active
              ? `"${selectedAdmin?.full_name}" adminni bloklashni xohlaysizmi?`
              : `"${selectedAdmin?.full_name}" adminni blokdan chiqarishni xohlaysizmi?`}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmModal(false)}>
              Bekor qilish
            </Button>
            <Button
              variant={selectedAdmin?.is_active ? 'danger' : 'primary'}
              loading={toggleBlock.isPending}
              onClick={() =>
                selectedAdmin && toggleBlock.mutate({ id: selectedAdmin.id, block: selectedAdmin.is_active })
              }
            >
              {selectedAdmin?.is_active ? 'Bloklash' : 'Blokdan chiqarish'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        open={roleModal}
        onOpenChange={setRoleModal}
        title="Rolni o'zgartirish"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            "{selectedAdmin?.full_name}" uchun yangi rolni tanlang:
          </p>
          <select
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as AdminUser['role'])}
          >
            <option value="moderator">Moderator</option>
            <option value="regional_admin">Hududiy Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRoleModal(false)}>
              Bekor qilish
            </Button>
            <Button
              loading={changeRole.isPending}
              onClick={() =>
                selectedAdmin && changeRole.mutate({ id: selectedAdmin.id, role: newRole })
              }
            >
              Saqlash
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteModal}
        onOpenChange={setDeleteModal}
        title="Adminni o'chirish"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            "{selectedAdmin?.full_name}" adminni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteModal(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              loading={deleteAdmin.isPending}
              onClick={() => selectedAdmin && deleteAdmin.mutate(selectedAdmin.id)}
            >
              O'chirish
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default AdminManagementPage;
