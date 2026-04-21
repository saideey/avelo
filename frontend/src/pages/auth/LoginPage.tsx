import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { PhoneInput } from '@/shared/components/PhoneInput';
import { Button } from '@/shared/components/Button';
import api from '@/shared/api/axios';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('998');
  const [loading, setLoading] = useState(false);

  const isValid = phone.replace(/\D/g, '').length === 12;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: `+${phone}` });
      navigate('/verify-otp', { state: { phone } });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="rounded-3xl border border-gray-100 bg-white/80 p-8 shadow-xl backdrop-blur-md">
          {/* brand */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mb-8 flex flex-col items-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
              <img src="/avelo-logo.svg" alt="AVELO" className="h-10" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">AVELO</h1>
            <p className="mt-1 text-center text-sm text-gray-500">
              Eng yaqin va ishonchli ustaxonani toping
            </p>
          </motion.div>

          {/* form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <PhoneInput
              label={t('auth.phone')}
              value={phone}
              onChange={setPhone}
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              disabled={!isValid}
            >
              {t('auth.sendCode')}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Davom etish orqali siz foydalanish shartlariga rozilik bildirasiz
        </p>
      </motion.div>
    </div>
  );
}
