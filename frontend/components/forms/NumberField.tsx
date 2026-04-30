'use client';

import { cn } from '@/lib/utils';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  compact?: boolean;
}

export default function NumberField({ label, value, onChange, step = 0.01, min, max, suffix, compact = false }: NumberFieldProps) {
  return (
    <label className={cn('grid gap-2 text-sm text-[#A1AAB8]', compact && 'gap-1.5')}>
      <span>{label}</span>
      <div className="relative">
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-11 w-full rounded-lg border border-white/10 bg-[#070B14] px-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-[#4F8CFF]/40 focus:ring-[#4F8CFF]/30"
        />
        {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A1AAB8]">{suffix}</span> : null}
      </div>
    </label>
  );
}
