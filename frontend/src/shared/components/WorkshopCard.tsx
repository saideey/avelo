import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, BadgeCheck, Wrench } from 'lucide-react';
import { cn, formatPrice } from '@/shared/lib/utils';
import { StarRating } from './StarRating';

export interface WorkshopCardProps {
  id: string | number;
  name: string;
  photo?: string | null;
  isVerified?: boolean;
  rating: number;
  reviewCount: number;
  address: string;
  distance?: string;
  priceFrom?: number;
  priceTo?: number;
  topServices?: string[];
  className?: string;
}

const WorkshopCard: React.FC<WorkshopCardProps> = ({
  id,
  name,
  photo,
  isVerified = false,
  rating,
  reviewCount,
  address,
  distance,
  priceFrom,
  priceTo,
  topServices = [],
  className,
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow duration-300 hover:shadow-lg',
        className
      )}
      onClick={() => navigate(`/workshops/${id}`)}
    >
      {/* Photo */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Wrench className="h-12 w-12 text-gray-400" />
          </div>
        )}
        {distance && (
          <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 backdrop-blur-sm">
            {distance}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name + Verified */}
        <div className="flex items-start gap-1.5">
          <h3 className="flex-1 text-base font-semibold text-gray-900 line-clamp-1">
            {name}
          </h3>
          {isVerified && (
            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          )}
        </div>

        {/* Rating */}
        <div className="mt-1.5 flex items-center gap-2">
          <StarRating value={rating} size="sm" />
          <span className="text-sm font-medium text-gray-700">
            {rating.toFixed(1)}
          </span>
          <span className="text-sm text-gray-400">
            ({reviewCount})
          </span>
        </div>

        {/* Address */}
        <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">{address}</span>
        </div>

        {/* Price */}
        {(priceFrom !== undefined || priceTo !== undefined) && (
          <div className="mt-2 text-sm font-semibold text-gray-900">
            {priceFrom !== undefined && priceTo !== undefined ? (
              <>
                {formatPrice(priceFrom)} — {formatPrice(priceTo)}
              </>
            ) : priceFrom !== undefined ? (
              <>{formatPrice(priceFrom)}dan</>
            ) : null}
          </div>
        )}

        {/* Top Services */}
        {topServices.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {topServices.slice(0, 3).map((service) => (
              <span
                key={service}
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
              >
                {service}
              </span>
            ))}
            {topServices.length > 3 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-400">
                +{topServices.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

WorkshopCard.displayName = 'WorkshopCard';

export { WorkshopCard };
