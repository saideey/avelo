import React from 'react';
import { cn, formatPrice } from '@/shared/lib/utils';

export interface PriceTagProps {
  price?: number;
  priceFrom?: number;
  priceTo?: number;
  showFrom?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const PriceTag: React.FC<PriceTagProps> = ({
  price,
  priceFrom,
  priceTo,
  showFrom = false,
  size = 'md',
  className,
}) => {
  const renderPrice = () => {
    if (priceFrom !== undefined && priceTo !== undefined) {
      return (
        <>
          {formatPrice(priceFrom)}
          <span className="mx-1 text-gray-400">&mdash;</span>
          {formatPrice(priceTo)}
        </>
      );
    }

    const displayPrice = price ?? priceFrom ?? priceTo;
    if (displayPrice === undefined) return null;

    return (
      <>
        {showFrom && (
          <span className="mr-1 font-normal text-gray-500">dan</span>
        )}
        {formatPrice(displayPrice)}
      </>
    );
  };

  return (
    <span
      className={cn(
        'font-semibold text-gray-900',
        sizeClasses[size],
        className
      )}
    >
      {renderPrice()}
    </span>
  );
};

PriceTag.displayName = 'PriceTag';

export { PriceTag };
