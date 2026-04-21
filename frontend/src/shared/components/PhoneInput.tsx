import React, { useCallback } from 'react';
import { Phone } from 'lucide-react';
import { Input, type InputProps } from './Input';

export interface PhoneInputProps extends Omit<InputProps, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
}

function formatUzbekPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  let local = digits;
  if (local.startsWith('998')) {
    local = local.slice(3);
  }

  local = local.slice(0, 9);

  if (local.length === 0) return '+998 ';
  if (local.length <= 2) return `+998 ${local}`;
  if (local.length <= 5) return `+998 ${local.slice(0, 2)} ${local.slice(2)}`;
  if (local.length <= 7)
    return `+998 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  return `+998 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
}

function extractDigits(formatted: string): string {
  const digits = formatted.replace(/\D/g, '');
  if (digits.startsWith('998')) return digits;
  return '998' + digits;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, ...props }, ref) => {
    const displayValue = formatUzbekPhone(value);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const digits = extractDigits(raw);

        if (digits.length <= 12) {
          onChange?.(digits);
        }
      },
      [onChange]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && value.length <= 3) {
          e.preventDefault();
        }
      },
      [value]
    );

    return (
      <Input
        ref={ref}
        type="tel"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        iconLeft={<Phone className="h-4 w-4" />}
        placeholder="+998 XX XXX XX XX"
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
