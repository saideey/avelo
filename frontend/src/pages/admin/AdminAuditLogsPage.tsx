import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Filter,
} from 'lucide-react';
import api from '@/shared/api/axios';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';

interface AuditLog {
  id: number;
  admin_name: string;
  action: 'create' | 'update' | 'delete' | 'block' | 'unblock' | 'verify' | 'approve' | 'reject';
  resource_type: string;
  resource_id: number | string;
  description: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  created_at: string;
}

interface AuditLogsResponse {
  items: AuditLog[];
  total: number;
  page: number;
  pages: number;
}

const actionConfig: Record<string, { label: string; variant: 'success' | 'primary' | 'danger' | 'warning' | 'default' }> = {
  create: { label: 'Yaratish', variant: 'success' },
  update: { label: 'Yangilash', variant: 'primary' },
  delete: { label: "O'chirish", variant: 'danger' },
  block: { label: 'Bloklash', variant: 'danger' },
  unblock: { label: 'Blokdan chiqarish', variant: 'success' },
  verify: { label: 'Tasdiqlash', variant: 'success' },
  approve: { label: 'Qabul qilish', variant: 'success' },
  reject: { label: 'Rad etish', variant: 'danger' },
};

const actionTypes = [
  { value: '', label: 'Barchasi' },
  { value: 'create', label: 'Yaratish' },
  { value: 'update', label: 'Yangilash' },
  { value: 'delete', label: "O'chirish" },
  { value: 'block', label: 'Bloklash' },
  { value: 'verify', label: 'Tasdiqlash' },
  { value: 'approve', label: 'Qabul qilish' },
  { value: 'reject', label: 'Rad etish' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const AdminAuditLogsPage: React.FC = () => {
  const [adminFilter, setAdminFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ['admin-audit-logs', { adminFilter, actionFilter, dateFrom, dateTo, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 30 };
      if (adminFilter) params.admin = adminFilter;
      if (actionFilter) params.action = actionFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const { data } = await api.get('/admin/audit-logs', { params })
        .catch(() => ({ data: { items: [], total: 0, page: 1, pages: 1 } }));
      return {
        items: data?.items || [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        pages: data?.pages ?? 1,
      };
    },
  });

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderJsonDiff = (label: string, value?: Record<string, unknown>) => {
    if (!value || Object.keys(value).length === 0) return null;
    return (
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase mb-1">{label}</p>
        <pre className="rounded-lg bg-gray-900 p-3 text-xs text-green-400 overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Admin harakatlari tarixi (faqat Super Admin)
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filtrlar</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Admin nomi..."
            iconLeft={<Search className="h-4 w-4" />}
            value={adminFilter}
            onChange={(e) => { setAdminFilter(e.target.value); setPage(1); }}
          />
          <select
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          >
            {actionTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              placeholder="Dan"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              placeholder="Gacha"
            />
          </div>
        </div>
      </motion.div>

      {/* Timeline / Table */}
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
            icon={<FileText className="h-8 w-8" />}
            title="Loglar topilmadi"
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="w-8 px-4 py-3" />
                    <th className="px-6 py-3">Vaqt</th>
                    <th className="px-6 py-3">Admin</th>
                    <th className="px-6 py-3">Harakat</th>
                    <th className="px-6 py-3">Resurs turi</th>
                    <th className="px-6 py-3">Resurs ID</th>
                    <th className="px-6 py-3">Tavsif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((log) => {
                    const config = actionConfig[log.action] ?? { label: log.action, variant: 'default' as const };
                    const isExpanded = expandedId === log.id;
                    const hasDetails = log.old_value || log.new_value;

                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          className={cn(
                            'transition-colors',
                            hasDetails ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50'
                          )}
                          onClick={() => hasDetails && toggleExpand(log.id)}
                        >
                          <td className="px-4 py-4">
                            {hasDetails && (
                              isExpanded
                                ? <ChevronUp className="h-4 w-4 text-gray-400" />
                                : <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-xs font-mono text-gray-500">
                            {log.created_at}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {log.admin_name}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={config.variant}>
                              {config.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {log.resource_type}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-500">
                            #{log.resource_id}
                          </td>
                          <td className="max-w-xs px-6 py-4 text-sm text-gray-700 truncate">
                            {log.description}
                          </td>
                        </tr>
                        {/* Expanded Row */}
                        <AnimatePresence>
                          {isExpanded && hasDetails && (
                            <tr>
                              <td colSpan={7} className="px-0 py-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="grid grid-cols-1 gap-4 bg-gray-50 px-14 py-4 lg:grid-cols-2">
                                    {renderJsonDiff('Eski qiymat (old_value)', log.old_value)}
                                    {renderJsonDiff('Yangi qiymat (new_value)', log.new_value)}
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Timeline */}
            <div className="space-y-0 p-4 md:hidden">
              {data.items.map((log) => {
                const config = actionConfig[log.action] ?? { label: log.action, variant: 'default' as const };
                const isExpanded = expandedId === log.id;
                const hasDetails = log.old_value || log.new_value;

                return (
                  <div key={log.id} className="relative border-l-2 border-gray-200 pb-6 pl-6 last:pb-0">
                    {/* Timeline dot */}
                    <div className={cn(
                      'absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full',
                      config.variant === 'success' ? 'bg-green-500' :
                      config.variant === 'danger' ? 'bg-red-500' :
                      config.variant === 'primary' ? 'bg-blue-500' :
                      'bg-gray-400'
                    )} />
                    <div
                      className={cn('rounded-lg border border-gray-100 bg-white p-3', hasDetails && 'cursor-pointer')}
                      onClick={() => hasDetails && toggleExpand(log.id)}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant={config.variant} size="sm">
                          {config.label}
                        </Badge>
                        <span className="text-xs text-gray-400">{log.created_at}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-gray-900">{log.admin_name}</p>
                      <p className="mt-1 text-sm text-gray-600">{log.description}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                        <span>{log.resource_type}</span>
                        <span>#{log.resource_id}</span>
                      </div>
                      <AnimatePresence>
                        {isExpanded && hasDetails && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 space-y-3 overflow-hidden"
                          >
                            {renderJsonDiff('Eski qiymat', log.old_value)}
                            {renderJsonDiff('Yangi qiymat', log.new_value)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <p className="text-sm text-gray-500">Jami: {data.total} ta log</p>
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
    </motion.div>
  );
};

export default AdminAuditLogsPage;
