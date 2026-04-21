import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { OtpInput } from '@/shared/components/OtpInput';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/shared/hooks/useAuth';
import { formatPhone } from '@/shared/lib/utils';
import api from '@/shared/api/axios';

const COUNTDOWN = 60;

export default function VerifyOtpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const phone = (location.state as any)?.phone as string | undefined;
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(COUNTDOWN);
  const [error, setError] = useState('');

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const handleResend = async () => {
    try {
      await api.post('/auth/send-otp', { phone: `+${phone}` });
      setSeconds(COUNTDOWN);
      toast.success('Kod qayta yuborildi');
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleComplete = useCallback(
    async (code: string) => {
      setLoading(true);
      setError('');
      try {
        const { data: tokens } = await api.post('/auth/verify-otp', {
          phone: `+${phone}`,
          code,
        });

        // Save tokens first
        login({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });

        // Fetch user profile to check if registration is needed
        const { data: user } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!user.full_name) {
          // New user — needs to complete registration
          navigate('/register', { state: { phone } });
        } else {
          // Existing user — redirect based on role
          const adminRoles = ['admin', 'super_admin', 'regional_admin', 'moderator'];
          if (adminRoles.includes(user.role)) {
            navigate('/admin');
          } else if (user.role === 'partner') {
            navigate('/partner');
          } else {
            navigate('/');
          }
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Noto'g'ri kod");
        toast.error(err?.response?.data?.detail || "Noto'g'ri kod");
      } finally {
        setLoading(false);
      }
    },
    [phone, login, navigate],
  );

  if (!phone) return <Navigate to="/login" replace />;

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
          {/* back */}
          <button
            onClick={() => navigate('/login')}
            className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </button>

          {/* brand */}
          <div className="mb-6 flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
              <Wrench className="h-7 w-7 text-white" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">{t('auth.enterCode')}</h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              {t('auth.codeHint')}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-700">
              {formatPhone(phone)}
            </p>
          </div>

          {/* otp */}
          <div className="flex justify-center">
            <OtpInput
              length={4}
              onComplete={handleComplete}
              error={error}
              disabled={loading}
            />
          </div>

          {/* timer / resend */}
          <div className="mt-6 flex justify-center">
            {seconds > 0 ? (
              <span className="text-sm text-gray-400">
                {t('auth.resendIn', { seconds })}
              </span>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleResend}>
                {t('auth.resend')}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
