import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, User, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/utils';
import api from '@/shared/api/axios';

type Role = 'customer' | 'partner';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { phone?: string; tokens?: any } | null;
  const { login } = useAuth();

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [loading, setLoading] = useState(false);

  if (!state?.phone) return <Navigate to="/login" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        phone: `+${state.phone}`,
        full_name: fullName.trim(),
        role,
      });

      const tokens = data.access_token ? data : state.tokens;
      if (tokens) {
        login({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
      }

      navigate(role === 'partner' ? '/partner' : '/');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const roles: { value: Role; label: string; icon: React.ReactNode; description: string }[] = [
    {
      value: 'customer',
      label: t('auth.customer'),
      icon: <User className="h-7 w-7" />,
      description: "Ustaxonalarni qidiring va band qiling",
    },
    {
      value: 'partner',
      label: t('auth.partner'),
      icon: <Store className="h-7 w-7" />,
      description: "Ustaxonangizni boshqaring",
    },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="rounded-3xl border border-gray-100 bg-white/80 p-8 shadow-xl backdrop-blur-md">
          {/* header */}
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
              <Wrench className="h-7 w-7 text-white" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">{t('auth.register')}</h2>
            <p className="mt-1 text-sm text-gray-500">Ma'lumotlaringizni kiriting</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label={t('auth.fullName')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ism Familiya"
              autoFocus
            />

            {/* role selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('auth.selectRole')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => (
                  <motion.button
                    key={r.value}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setRole(r.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all',
                      role === r.value
                        ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl',
                        role === r.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {r.icon}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{r.label}</span>
                    <span className="text-xs text-gray-500">{r.description}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              disabled={!fullName.trim()}
            >
              {t('auth.register')}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
