import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  showClose?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  className,
  showClose = true,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] rounded-2xl bg-white p-6 shadow-2xl',
                  sizeClasses[size],
                  className
                )}
                initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {showClose && (
                  <Dialog.Close asChild>
                    <button
                      className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                )}
                {title ? (
                  <Dialog.Title className="text-lg font-semibold text-gray-900 pr-8">
                    {title}
                  </Dialog.Title>
                ) : (
                  <Dialog.Title className="sr-only">Dialog</Dialog.Title>
                )}
                {description ? (
                  <Dialog.Description className="mt-1.5 text-sm text-gray-500">
                    {description}
                  </Dialog.Description>
                ) : (
                  <Dialog.Description className="sr-only">Dialog content</Dialog.Description>
                )}
                <div className={cn((title || description) && 'mt-5')}>
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

Modal.displayName = 'Modal';

export { Modal };
