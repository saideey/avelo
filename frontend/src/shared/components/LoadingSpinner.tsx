import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
};

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-blue-600', sizeClasses[size])} />
      {label && (
        <p className="text-sm text-gray-500">{label}</p>
      )}
    </div>
  );
};

LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner };
