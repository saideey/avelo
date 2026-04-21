import React, { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showValue?: boolean;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  interactive = false,
  size = 'md',
  className,
  showValue = false,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;

  const handleClick = useCallback(
    (starIndex: number, isHalf: boolean) => {
      if (!interactive || !onChange) return;
      const newValue = isHalf ? starIndex + 0.5 : starIndex + 1;
      onChange(newValue);
    },
    [interactive, onChange]
  );

  const handleMouseMove = useCallback(
    (starIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const isHalf = e.clientX - rect.left < rect.width / 2;
      setHoverValue(isHalf ? starIndex + 0.5 : starIndex + 1);
    },
    [interactive]
  );

  const renderStar = (index: number) => {
    const fillLevel = Math.min(1, Math.max(0, displayValue - index));

    return (
      <div
        key={index}
        className={cn('relative', interactive && 'cursor-pointer')}
        onMouseMove={(e) => handleMouseMove(index, e)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const isHalf = e.clientX - rect.left < rect.width / 2;
          handleClick(index, isHalf);
        }}
      >
        {/* Empty star background */}
        <Star
          className={cn(sizeMap[size], 'text-gray-300')}
          fill="currentColor"
          strokeWidth={0}
        />
        {/* Filled portion */}
        {fillLevel > 0 && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${fillLevel * 100}%` }}
          >
            <Star
              className={cn(sizeMap[size], 'text-amber-400')}
              fill="currentColor"
              strokeWidth={0}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      onMouseLeave={() => interactive && setHoverValue(null)}
    >
      {Array.from({ length: 5 }).map((_, i) => renderStar(i))}
      {showValue && (
        <span className="ml-1.5 text-sm font-medium text-gray-700">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
};

StarRating.displayName = 'StarRating';

export { StarRating };
