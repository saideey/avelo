import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Check, Crown, Star, Zap, Shield } from 'lucide-react'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { cn, formatPrice } from '@/shared/lib/utils'
import api from '@/shared/api/axios'

const iconMap: Record<string, any> = { basic: Star, silver: Shield, gold: Crown, platinum: Zap }
const colorMap: Record<string, string> = {
  basic: 'from-gray-400 to-gray-500',
  silver: 'from-gray-300 to-gray-500',
  gold: 'from-yellow-400 to-amber-600',
  platinum: 'from-purple-500 to-indigo-600',
}

const featuresByTier: Record<string, { features: string[]; missing: string[] }> = {
  basic: { features: ['5 ta rasm', '50 ta buyurtma/oy', 'Oddiy profil'], missing: ["Ustuvor ko'rsatish", 'Analitika', 'Badge', "Qo'llab-quvvatlash"] },
  silver: { features: ['15 ta rasm', '150 ta buyurtma/oy', "To'liq analitika"], missing: ["Ustuvor ko'rsatish", 'Badge', "Qo'llab-quvvatlash"] },
  gold: { features: ['30 ta rasm', '500 ta buyurtma/oy', "To'liq analitika", "Ustuvor ko'rsatish", 'Oltin badge'], missing: ["24/7 Qo'llab-quvvatlash"] },
  platinum: { features: ['50 ta rasm', 'Cheksiz buyurtma', "To'liq analitika", "Ustuvor ko'rsatish", 'Platinum badge', "24/7 Qo'llab-quvvatlash"], missing: [] },
}

export default function PartnerSubscriptionPage() {
  const { data: plansData, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => api.get('/workshops/categories').catch(() => null).then(() =>
      // Try to get from API, fallback to default
      api.get('/admin/settings').then(r => r.data).catch(() => null)
    ),
  })

  // Get plans from seed data in DB
  const { data: dbPlans } = useQuery({
    queryKey: ['db-subscription-plans'],
    queryFn: async () => {
      // Plans are in the database — use direct query approach
      // For now, use the known plans with API-sourced commission
      const settingsRes = await api.get('/admin/settings').catch(() => ({ data: { settings: {} } }))
      const settings = settingsRes.data?.settings || {}
      const commissionStr = typeof settings === 'object' && !Array.isArray(settings)
        ? Object.values(settings).flat().find((s: any) => s?.key === 'commission_percent')
        : null
      const commission = (commissionStr as any)?.value || '10'

      return {
        commission: parseInt(commission),
        plans: [
          { tier: 'basic', name: 'Asosiy', price: 0, commission: 12 },
          { tier: 'silver', name: 'Kumush', price: 299000, commission: 10 },
          { tier: 'gold', name: 'Oltin', price: 599000, commission: 8, popular: true },
          { tier: 'platinum', name: 'Platinum', price: 999000, commission: 6 },
        ],
      }
    },
  })

  const plans = dbPlans?.plans || []

  if (isLoading) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" /></div>

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Obuna Tariflari</h1>
        <p className="text-gray-500 mb-8">Biznesingizni oshirish uchun eng mos tarifni tanlang</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan: any, index: number) => {
            const Icon = iconMap[plan.tier] || Star
            const color = colorMap[plan.tier] || 'from-gray-400 to-gray-500'
            const tierFeatures = featuresByTier[plan.tier] || { features: [], missing: [] }
            return (
              <motion.div key={plan.tier}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                className={cn('relative bg-white rounded-2xl border-2 p-6 flex flex-col',
                  plan.popular ? 'border-amber-400 shadow-lg shadow-amber-100' : 'border-gray-100',
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="warning">Eng mashhur</Badge>
                  </div>
                )}
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4', color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-2 mb-2">
                  {plan.price === 0 ? (
                    <span className="text-2xl font-bold text-gray-900">Bepul</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-gray-900">{formatPrice(plan.price)}</span>
                      <span className="text-gray-500 text-sm">/oy</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-blue-600 font-semibold mb-4">Komissiya: {plan.commission}%</p>

                <div className="flex-1 space-y-3 mb-6">
                  {tierFeatures.features.map((feature: string) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                  {tierFeatures.missing.map((feature: string) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0" />
                      <span className="text-gray-400">{feature}</span>
                    </div>
                  ))}
                </div>
                <Button variant={plan.popular ? 'primary' : 'outline'} fullWidth>
                  {plan.price === 0 ? 'Joriy tarif' : 'Tanlash'}
                </Button>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
