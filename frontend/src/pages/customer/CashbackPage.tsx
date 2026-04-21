import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, TrendingUp, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { formatPrice, cn } from '@/shared/lib/utils';
import api from '@/shared/api/axios';

const tierConfig: Record<
  string,
  {
    gradient: string;
    label: string;
    percent: string;
    min: number;
    nextMin: number;
    benefits: string[];
  }
> = {
  Bronze: {
    gradient: 'from-amber-600 to-orange-500',
    label: 'BRONZA',
    percent: '2%',
    min: 0,
    nextMin: 500000,
    benefits: ['Asosiy xizmatlar'],
  },
  Silver: {
    gradient: 'from-gray-400 to-gray-500',
    label: 'KUMUSH',
    percent: '3.5%',
    min: 500000,
    nextMin: 2000000,
    benefits: ['Ustuvor navbat', 'Bepul diagnostika x1'],
  },
  Gold: {
    gradient: 'from-yellow-500 to-amber-400',
    label: 'OLTIN',
    percent: '5%',
    min: 2000000,
    nextMin: 5000000,
    benefits: ['Ustuvor navbat', 'Chegirma', 'Bepul diagnostika x2'],
  },
  Platinum: {
    gradient: 'from-indigo-500 to-purple-500',
    label: 'PLATINUM',
    percent: '7%',
    min: 5000000,
    nextMin: 10000000,
    benefits: ['VIP xizmat', 'Evakuator', 'Shaxsiy menejer', 'Bepul 1 moy almashtirish'],
  },
};

export default function CashbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: cashback, isLoading } = useQuery({
    queryKey: ['cashback-detail'],
    queryFn: () => api.get('/users/me/cashback').then((r) => r.data).catch(() => null),
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const rawTier = cashback?.tier || 'bronze';
  const tier = rawTier.charAt(0).toUpperCase() + rawTier.slice(1) as keyof typeof tierConfig;
  const balance = cashback?.balance || 0;
  const totalSpent = cashback?.total_spent || 0;
  const config = tierConfig[tier] || tierConfig.Bronze;
  const progress = Math.min(100, ((totalSpent - config.min) / (config.nextMin - config.min)) * 100);

  const tiers = Object.keys(tierConfig);
  const nextTier = tiers[tiers.indexOf(tier) + 1] || tier;

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      {/* header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{t('nav.cashback')}</h1>
      </div>

      {/* balance card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'mt-5 overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-xl',
          config.gradient,
        )}
      >
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wide opacity-90">{tier}</span>
        </div>
        <p className="mt-4 text-3xl font-bold">{formatPrice(balance)}</p>
        <p className="mt-1 text-sm opacity-80">Mavjud cashback</p>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-80">{tier}</span>
            <span className="opacity-80">{nextTier}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-2 text-xs opacity-70">
            {formatPrice(config.nextMin - totalSpent)} gacha {nextTier} darajaga
          </p>
        </div>
      </motion.div>

      {/* tier benefits */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-5"
      >
        <h2 className="mb-3 text-base font-semibold text-gray-900">Daraja imtiyozlari</h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(tierConfig).map(([key, tc]) => {
            const isCurrentTier = key === tier;
            return (
              <div
                key={key}
                className={cn(
                  'relative overflow-hidden rounded-2xl border p-3 transition-all',
                  isCurrentTier
                    ? 'border-blue-200 bg-blue-50 shadow-md ring-2 ring-blue-500/20'
                    : 'border-gray-100 bg-white shadow-sm',
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider',
                      tc.gradient,
                    )}
                  >
                    {tc.label}
                  </span>
                  <span className="text-xs font-bold text-gray-700">{tc.percent}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {tc.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-1 text-[11px] text-gray-600">
                      <span className="mt-0.5 text-green-500">&#10003;</span>
                      {b}
                    </li>
                  ))}
                </ul>
                {isCurrentTier && (
                  <span className="absolute right-2 top-2 text-[10px] font-semibold text-blue-600">
                    Joriy
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-5 grid grid-cols-2 gap-3"
      >
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="mt-3 text-lg font-bold text-gray-900">{formatPrice(cashback?.total_earned || 0)}</p>
          <p className="text-xs text-gray-500">Jami ishlab topilgan</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <ArrowUpRight className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-lg font-bold text-gray-900">{formatPrice(cashback?.total_spent || 0)}</p>
          <p className="text-xs text-gray-500">Jami sarflangan</p>
        </div>
      </motion.div>

      {/* transactions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6"
      >
        <h2 className="mb-3 text-base font-semibold text-gray-900">Tranzaksiyalar tarixi</h2>
        {(cashback?.transactions || []).length > 0 ? (
          <div className="space-y-2">
            {(cashback.transactions as any[]).map((tx: any) => {
              const isEarned = tx.type === 'earned'
              const isSpent = tx.type === 'spent'
              return (
                <div key={tx.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl',
                    isEarned ? 'bg-emerald-50' : isSpent ? 'bg-red-50' : 'bg-gray-50'
                  )}>
                    {isEarned ? (
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {isEarned ? 'Cashback olindi' : isSpent ? 'Cashback sarflandi' : tx.type}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tx.source || 'Buyurtma'} · {tx.created_at ? new Date(tx.created_at).toLocaleDateString('uz', { day: 'numeric', month: 'short' }) : ''}
                    </p>
                  </div>
                  <p className={cn('text-sm font-bold', isEarned ? 'text-emerald-600' : 'text-red-500')}>
                    {isEarned ? '+' : '-'}{formatPrice(Math.abs(tx.amount))}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-400">Hali tranzaksiyalar yo'q</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
