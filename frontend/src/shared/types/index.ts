export interface User {
  id: string
  phone: string
  full_name: string
  role: 'customer' | 'partner' | 'mechanic' | 'admin' | 'super_admin' | 'regional_admin' | 'moderator'
  avatar_url: string | null
  is_verified: boolean
  region: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  admin_id: string
  admin_name?: string
  action: string
  resource_type: string
  resource_id: string | null
  description: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface Complaint {
  id: string
  complainant_id: string
  complainant_name?: string
  against_id: string | null
  against_name?: string
  workshop_id: string | null
  workshop_name?: string
  booking_id: string | null
  type: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated'
  subject: string
  description: string
  resolution: string | null
  assigned_to: string | null
  assignee_name?: string
  resolved_at: string | null
  priority: number
  created_at: string
}

export interface PlatformSetting {
  id: string
  key: string
  value: string
  description: string | null
  category: string
}

export interface Workshop {
  id: string
  name: string
  slug: string
  description: string
  address: string
  city: string
  district: string
  latitude: number
  longitude: number
  phone: string
  working_hours: Record<string, string>
  is_verified: boolean
  is_active: boolean
  subscription_tier: string
  rating_avg: number
  total_reviews: number
  main_photo_url?: string
  distance?: number
  services?: WorkshopService[]
  photos?: WorkshopPhoto[]
  schedule?: WorkshopSchedule[]
}

export interface WorkshopService {
  id: string
  name: string
  price_from: number
  price_to: number
  duration_minutes: number
  is_available: boolean
}

export interface WorkshopPhoto {
  id: string
  url: string
  order: number
  is_main: boolean
}

export interface WorkshopSchedule {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
  slot_duration_minutes: number
}

export interface Booking {
  id: string
  workshop_name: string
  workshop_slug?: string
  vehicle_info?: string
  services: { name: string; price: number }[]
  scheduled_at: string
  status: BookingStatus
  total_price: number
  notes?: string
  created_at: string
}

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'

export interface Payment {
  id: string
  booking_id: string
  amount: number
  method: string
  status: string
  paid_at: string | null
}

export interface Review {
  id: string
  customer_name: string
  rating_quality: number
  rating_price: number
  rating_time: number
  rating_communication: number
  rating_overall: number
  comment: string | null
  reply: string | null
  created_at: string
}

export interface Vehicle {
  id: string
  brand_name: string
  model_name: string
  year: number
  license_plate: string | null
  color: string | null
  mileage: number | null
}

export interface Warranty {
  id: string
  booking_id: string
  service_name: string
  duration_months: number
  expires_at: string
  status: 'active' | 'claimed' | 'expired' | 'void'
}

export interface CashbackWallet {
  balance: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  total_earned: number
  total_spent: number
}

export interface Notification {
  id: string
  title: string
  body: string
  type: string
  is_read: boolean
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface AvailableSlot {
  time: string
  is_available: boolean
}
