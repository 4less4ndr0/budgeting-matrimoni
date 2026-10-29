import { Input } from '@/components/ui/input';

/** Empty field ↔ null, so "not entered" never turns into a misleading 0. */
export function NumeroInput({
  value,
  onChange,
  placeholder,
  step = '0.01',
  min = '0',
  max,
  id,
  className,
  'aria-label': ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
  id?: string;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <Input
      id={id}
      type="number"
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      className={className}
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  );
}
