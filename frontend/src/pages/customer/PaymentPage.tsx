import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CheckCircle, CreditCard, Banknote, Shield, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { cn, formatPrice } from '@/shared/lib/utils'
import api from '@/shared/api/axios'

type Step = 'method' | 'card' | 'sms' | 'success'
type Method = 'click' | 'payme' | 'paynet' | 'cash'

const METHODS = [
  { key: 'click' as Method, name: 'Click', logo: '/click.png', desc: 'Click orqali to\'lash' },
  { key: 'payme' as Method, name: 'Payme', logo: '/payme.png', desc: 'Payme orqali to\'lash' },
  { key: 'paynet' as Method, name: 'Paynet', logo: '/paynet.png', desc: 'Paynet orqali to\'lash' },
  { key: 'cash' as Method, name: 'Naqd pul', logo: '', desc: 'Ustaxonada naqd to\'lash', icon: Banknote },
]

export default function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const booking = (location.state as any)?.booking

  const [step, setStep] = useState<Step>('method')
  const [method, setMethod] = useState<Method | null>(null)
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [loading, setLoading] = useState(false)

  if (!booking) return <Navigate to="/" replace />

  const totalPrice = booking.total_price || 0

  // Format card number with spaces
  const formatCard = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 16)
    return nums.replace(/(.{4})/g, '$1 ').trim()
  }

  // Format expiry MM/YY
  const formatExpiry = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 4)
    if (nums.length > 2) return nums.slice(0, 2) + '/' + nums.slice(2)
    return nums
  }

  const handleSelectMethod = (m: Method) => {
    setMethod(m)
    if (m === 'cash') {
      handlePayCash()
    } else {
      setStep('card')
    }
  }

  const handleCardSubmit = () => {
    if (cardNumber.replace(/\s/g, '').length < 16) {
      toast.error('Karta raqamini to\'liq kiriting')
      return
    }
    if (cardExpiry.length < 5) {
      toast.error('Amal qilish muddatini kiriting')
      return
    }
    // "Send" SMS code (test mode — code is always 1234)
    toast.success('SMS kod yuborildi: 1234')
    setStep('sms')
  }

  const handleSmsVerify = async () => {
    if (smsCode !== '1234') {
      toast.error('Noto\'g\'ri kod. Test kodi: 1234')
      return
    }
    setLoading(true)
    try {
      const { data: payment } = await api.post('/payments/initiate', {
        booking_id: booking.id,
        method: method === 'paynet' ? 'card' : method,
        amount: totalPrice,
      })
      if (payment?.id) {
        await api.post(`/payments/test-complete/${payment.id}`).catch(() => {})
      }
      setStep('success')
    } catch (err: any) {
      const d = err?.response?.data?.detail
      toast.error(typeof d === 'string' ? d : d?.message || 'To\'lov amalga oshmadi')
    } finally {
      setLoading(false)
    }
  }

  const handlePayCash = async () => {
    setLoading(true)
    try {
      await api.post('/payments/initiate', {
        booking_id: booking.id,
        method: 'cash',
        amount: totalPrice,
      })
      setStep('success')
    } catch (err: any) {
      const d = err?.response?.data?.detail
      toast.error(typeof d === 'string' ? d : d?.message || 'Xatolik')
    } finally {
      setLoading(false)
    }
  }

  // Success screen
  if (step === 'success') {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-12 w-12 text-emerald-600" />
          </motion.div>
          <h2 className="mt-5 text-2xl font-extrabold text-gray-900">To'lov muvaffaqiyatli!</h2>
          <p className="mt-2 text-sm text-gray-500">Buyurtmangiz tasdiqlandi</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">{formatPrice(totalPrice)}</p>
          <Button className="mt-8 w-full" size="lg" onClick={() => navigate('/bookings')}>
            Buyurtmalarimga o'tish
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step === 'method' ? navigate(-1) : setStep(step === 'sms' ? 'card' : 'method')}
          className="rounded-full p-1.5 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          {step === 'method' ? 'To\'lov usulini tanlang' : step === 'card' ? 'Karta ma\'lumotlari' : 'SMS tasdiqlash'}
        </h1>
      </div>

      {/* Order Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white mb-6 shadow-lg shadow-blue-500/20"
      >
        <p className="text-xs text-blue-200">To'lov summasi</p>
        <p className="text-3xl font-extrabold mt-1">{formatPrice(totalPrice)}</p>
        <p className="text-xs text-blue-200 mt-1">Buyurtma #{String(booking.id).slice(0, 8)}</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Step 1: Method Selection */}
        {step === 'method' && (
          <motion.div key="method" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            <p className="text-sm font-semibold text-gray-700 mb-2">Karta orqali</p>
            <div className="grid grid-cols-3 gap-3">
              {METHODS.filter(m => m.key !== 'cash').map(m => (
                <button key={m.key} onClick={() => handleSelectMethod(m.key)}
                  className="flex flex-col items-center gap-2 rounded-2xl border-2 border-gray-100 bg-white p-4 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="h-12 w-full flex items-center justify-center">
                    <img src={m.logo} alt={m.name} className="h-10 object-contain" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{m.name}</span>
                </button>
              ))}
            </div>

            <p className="text-sm font-semibold text-gray-700 mt-4 mb-2">Boshqa usullar</p>
            <button onClick={() => handleSelectMethod('cash')}
              className="flex w-full items-center gap-4 rounded-2xl border-2 border-gray-100 bg-white p-4 hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <Banknote className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Naqd pul</p>
                <p className="text-xs text-gray-500">Ustaxonada naqd to'lash</p>
              </div>
            </button>
          </motion.div>
        )}

        {/* Step 2: Card Details */}
        {step === 'card' && method && (
          <motion.div key="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {/* Selected method */}
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              {METHODS.find(m => m.key === method)?.logo && (
                <img src={METHODS.find(m => m.key === method)!.logo} alt="" className="h-8 object-contain" />
              )}
              <span className="text-sm font-semibold text-gray-700">{METHODS.find(m => m.key === method)?.name} orqali to'lov</span>
            </div>

            {/* Card form */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 shadow-sm">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Karta raqami</label>
                <div className="relative">
                  <input type="text" value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))}
                    placeholder="8600 1234 5678 9012" maxLength={19}
                    className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 pr-12 text-lg font-mono tracking-widest focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Amal qilish muddati</label>
                  <input type="text" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY" maxLength={5}
                    className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-lg font-mono text-center tracking-widest focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 pb-3">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Xavfsiz to'lov</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>Ma'lumotlaringiz shifrlangan va xavfsiz</span>
            </div>

            <Button fullWidth size="lg" onClick={handleCardSubmit}
              className="h-13 text-base font-bold"
              disabled={cardNumber.replace(/\s/g, '').length < 16 || cardExpiry.length < 5}
            >
              SMS kod olish — {formatPrice(totalPrice)}
            </Button>
          </motion.div>
        )}

        {/* Step 3: SMS Verification */}
        {step === 'sms' && (
          <motion.div key="sms" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 mb-4">
                <Lock className="h-7 w-7 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">SMS tasdiqlash</h2>
              <p className="text-sm text-gray-500 mt-1">
                Karta raqamingizga yuborilgan 4 xonali kodni kiriting
              </p>
              <p className="text-xs text-blue-600 font-semibold mt-1">Test rejim: kod — 1234</p>
            </div>

            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map(i => (
                <input key={i} type="text" maxLength={1} value={smsCode[i] || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '')
                    const newCode = smsCode.split('')
                    newCode[i] = val
                    setSmsCode(newCode.join(''))
                    // Auto focus next
                    if (val && i < 3) {
                      const next = e.target.parentElement?.children[i + 1] as HTMLInputElement
                      next?.focus()
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !smsCode[i] && i > 0) {
                      const prev = (e.target as HTMLElement).parentElement?.children[i - 1] as HTMLInputElement
                      prev?.focus()
                    }
                  }}
                  className="h-14 w-14 rounded-xl border-2 border-gray-200 bg-gray-50 text-center text-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              ))}
            </div>

            <Button fullWidth size="lg" loading={loading}
              onClick={handleSmsVerify}
              disabled={smsCode.length < 4}
              className="h-13 text-base font-bold"
            >
              Tasdiqlash
            </Button>

            <button onClick={() => toast.success('SMS qayta yuborildi: 1234')}
              className="w-full text-center text-sm text-blue-600 font-semibold hover:text-blue-700"
            >
              Kodni qayta yuborish
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
