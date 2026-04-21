import React, { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';

export interface OtpInputProps {
  length?: number;
  onComplete?: (otp: string) => void;
  onChange?: (otp: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

const OtpInput: React.FC<OtpInputProps> = ({
  length = 4,
  onComplete,
  onChange,
  error,
  disabled = false,
  autoFocus = true,
  className,
}) => {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus();
      inputRefs.current[index]?.select();
    }
  }, [length]);

  const handleChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val && !/^\d$/.test(val)) return;

      const newValues = [...values];
      newValues[index] = val;
      setValues(newValues);

      const otp = newValues.join('');
      onChange?.(otp);

      if (val && index < length - 1) {
        focusInput(index + 1);
      }

      if (val && newValues.every((v) => v !== '')) {
        onComplete?.(otp);
      }
    },
    [values, length, onComplete, onChange, focusInput]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (!values[index] && index > 0) {
          const newValues = [...values];
          newValues[index - 1] = '';
          setValues(newValues);
          focusInput(index - 1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        focusInput(index - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusInput(index + 1);
      }
    },
    [values, focusInput]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (!pasted) return;

      const newValues = [...values];
      for (let i = 0; i < pasted.length; i++) {
        newValues[i] = pasted[i];
      }
      setValues(newValues);

      const otp = newValues.join('');
      onChange?.(otp);

      if (pasted.length === length) {
        onComplete?.(otp);
        inputRefs.current[length - 1]?.blur();
      } else {
        focusInput(pasted.length);
      }
    },
    [values, length, onComplete, onChange, focusInput]
  );

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="flex gap-3">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={values[index]}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            className={cn(
              'h-14 w-12 rounded-xl border-2 bg-white text-center text-xl font-semibold text-gray-900',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
              error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : values[index]
                  ? 'border-blue-500'
                  : 'border-gray-300'
            )}
          />
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

OtpInput.displayName = 'OtpInput';

export { OtpInput };
