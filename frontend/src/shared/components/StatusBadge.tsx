import React from 'react';
import { cn } from '@/shared/lib/utils';

type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

const statusConfig: Record<BookingStatus, { color: string; dotColor: string; label: string }> = {
  pending: {
    color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    dotColor: 'bg-yellow-500',
    label: 'Kutilmoqda',
  },
  confirmed: {
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    dotColor: 'bg-blue-500',
    label: 'Tasdiqlangan',
  },
  in_progress: {
    color: 'bg-orange-50 text-orange-800 border-orange-200',
    dotColor: 'bg-orange-500',
    label: 'Jarayonda',
  },
  completed: {
    color: 'bg-green-50 text-green-800 border-green-200',
    dotColor: 'bg-green-500',
    label: 'Bajarildi',
  },
  cancelled: {
    color: 'bg-red-50 text-red-800 border-red-200',
    dotColor: 'bg-red-500',
    label: 'Bekor qilingan',
  },
  no_show: {
    color: 'bg-gray-50 text-gray-800 border-gray-200',
    dotColor: 'bg-gray-500',
    label: 'Kelmadi',
  },
};

export interface StatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        config.color,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotColor)} />
      {config.label}
    </span>
  );
};

StatusBadge.displayName = 'StatusBadge';

export { StatusBadge };
export type { BookingStatus };
