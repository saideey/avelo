import React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn, getInitials } from '@/shared/lib/utils';

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-lg',
};

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '',
  size = 'md',
  className,
}) => {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100',
        sizeClasses[size],
        className
      )}
    >
      <AvatarPrimitive.Image
        src={src || undefined}
        alt={name}
        className="h-full w-full object-cover"
      />
      <AvatarPrimitive.Fallback
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 font-semibold text-white"
        delayMs={200}
      >
        {getInitials(name) || '?'}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
};

Avatar.displayName = 'Avatar';

export { Avatar };
