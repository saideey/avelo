import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from 'lucide-react';
import api from '@/shared/api/axios';
import { cn, formatPrice } from '@/shared/lib/utils';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { StatusBadge, type BookingStatus } from '@/shared/components/StatusBadge';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { EmptyState } from '@/shared/components/EmptyState';

interface CustomerBooking {
  id: number;
  service: string;
  date: string;
  status: BookingStatus;
  price: number;
}

interface Customer {
  id: number;
  customer_id?: string;
  name?: string;
  customer_name?: string;
  phone?: string;
  total_bookings: number;
  last_visit: string;
  total_spent: number;
  bookings?: CustomerBooking[];
}

type SortField = 'total_bookings' | 'total_spent' | 'last_visit';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const maskPhone = (phone: string) => {
  if (phone.length < 5) return phone;
  return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
};

const PartnerCustomersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('last_visit');
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['partner-customers'],
    queryFn: async () => {
      const { data } = await api.get('/partner/customers');
      return data?.items || data?.results || (Array.isArray(data) ? data : []);
    },
  });

  // Normalize customer data — API returns customer_id, customer_name
  const normalized = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    return customers.map((c: any, i: number) => ({
      ...c,
      id: c.id || c.customer_id || i,
      name: c.name || c.customer_name || 'Noma\'lum',
    }));
  }, [customers]);

  const filtered = useMemo(() => {
    let result = normalized.filter((c) =>
      (c.name || '').toLowerCase().includes(search.toLowerCase())
    );
    result.sort((a, b) => {
      switch (sortBy) {
        case 'total_bookings':
          return b.total_bookings - a.total_bookings;
        case 'total_spent':
          return b.total_spent - a.total_spent;
        case 'last_visit':
          return new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime();
        default:
          return 0;
      }
    });
    return result;
  }, [customers, search, sortBy]);

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
        <h1 className="text-2xl font-bold text-gray-900">Mijozlar</h1>
        <p className="mt-1 text-sm text-gray-500">Mijozlar ro'yxati va tarixlari</p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Mijozni qidirish..."
          iconLeft={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          wrapperClassName="flex-1"
        />
        <select
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortField)}
        >
          <option value="last_visit">Oxirgi tashrif</option>
          <option value="total_bookings">Buyurtmalar soni</option>
          <option value="total_spent">Umumiy xarajat</option>
        </select>
      </motion.div>

      {!filtered.length ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Mijozlar topilmadi"
          description={search ? "Qidiruv natijasi bo'sh" : "Mijozlar hali yo'q"}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <motion.div variants={itemVariants} className="hidden md:block rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Mijoz</th>
                    <th className="px-6 py-3">Telefon</th>
                    <th className="px-6 py-3 cursor-pointer" onClick={() => setSortBy('total_bookings')}>
                      <span className="flex items-center gap-1">Buyurtmalar <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="px-6 py-3 cursor-pointer" onClick={() => setSortBy('last_visit')}>
                      <span className="flex items-center gap-1">Oxirgi tashrif <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="px-6 py-3 cursor-pointer" onClick={() => setSortBy('total_spent')}>
                      <span className="flex items-center gap-1">Umumiy xarajat <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((customer) => {
                    const isExpanded = expandedId === customer.id;
                    return (
                      <React.Fragment key={customer.id}>
                        <tr
                          className="cursor-pointer transition-colors hover:bg-gray-50"
                          onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-sm font-semibold">
                                {(customer.name || customer.customer_name || 'Noma\'lum').charAt(0)}
                              </div>
                              <span className="text-sm font-medium text-gray-900">{(customer.name || customer.customer_name || 'Noma\'lum')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-mono">{maskPhone(customer.phone || '')}</td>
                          <td className="px-6 py-4">
                            <Badge variant="primary" size="sm">{customer.total_bookings}</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{customer.last_visit}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatPrice(customer.total_spent)}</td>
                          <td className="px-6 py-4 text-gray-400">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="bg-gray-50 px-6 py-4">
                              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                <div className="rounded-lg bg-white p-3">
                                  <p className="text-xs text-gray-500">Jami buyurtmalar</p>
                                  <p className="text-lg font-bold text-gray-900">{customer.total_bookings}</p>
                                </div>
                                <div className="rounded-lg bg-white p-3">
                                  <p className="text-xs text-gray-500">Jami xarajat</p>
                                  <p className="text-lg font-bold text-gray-900">{formatPrice(customer.total_spent)}</p>
                                </div>
                                <div className="rounded-lg bg-white p-3">
                                  <p className="text-xs text-gray-500">Oxirgi tashriф</p>
                                  <p className="text-sm font-medium text-gray-900">{customer.last_visit ? new Date(customer.last_visit).toLocaleDateString('uz') : '-'}</p>
                                </div>
                                <div className="rounded-lg bg-white p-3">
                                  <p className="text-xs text-gray-500">Telefon</p>
                                  <p className="text-sm font-mono text-gray-900">{maskPhone(customer.phone || '')}</p>
                                </div>
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
          </motion.div>

          {/* Mobile Cards */}
          <motion.div className="space-y-3 md:hidden" variants={containerVariants}>
            {filtered.map((customer) => {
              const isExpanded = expandedId === customer.id;
              return (
                <motion.div
                  key={customer.id}
                  variants={itemVariants}
                  className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-semibold text-sm">
                        {(customer.name || customer.customer_name || 'Noma\'lum').charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{(customer.name || customer.customer_name || 'Noma\'lum')}</p>
                        <p className="text-xs text-gray-500 font-mono">{maskPhone(customer.phone || '')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatPrice(customer.total_spent)}</p>
                      <p className="text-xs text-gray-500">{customer.total_bookings} buyurtma</p>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gray-100 p-4 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>Oxirgi tashrif: {customer.last_visit}</span>
                          </div>
                          {customer.bookings?.map((b) => (
                            <div key={b.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
                              <div>
                                <p className="font-medium text-gray-900">{b.service}</p>
                                <p className="text-xs text-gray-500">{b.date}</p>
                              </div>
                              <div className="text-right">
                                <StatusBadge status={b.status} />
                                <p className="mt-1 text-sm font-medium text-gray-900">{formatPrice(b.price)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default PartnerCustomersPage;
