'use client';

import { fromDisplayValue, toDisplayValue, unitSuffix, type UnitScale } from '@/lib/financial-modeling';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  rawValue: number;
  onChange: (raw: number) => void;
  displayUnit?: UnitScale;
  step?: number;
  min?: number;
  suffix?: string;
  compact?: boolean;
  disabled?: boolean;
};

export default function FinancialNumberField({
  label,
  rawValue,
  onChange,
  displayUnit = 'raw',
  step,
  min,
  suffix,
  compact = false,
  disabled = false,
}: Props) {
  const display = toDisplayValue(rawValue, displayUnit);
  const unit = unitSuffix(displayUnit);
  const resolvedStep = step ?? (displayUnit === 'raw' ? 1 : 0.01);

  return (
    <label className={cn('grid gap-2 text-sm text-[#A1AAB8]', compact && 'gap-1.5', disabled && 'opacity-60')}>
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {unit ? <span className="text-[10px] uppercase tracking-wider text-[#6F7F91]">{unit}</span> : null}
      </span>
      <div className="relative">
        <input
          type="number"
          step={resolvedStep}
          min={min}
          disabled={disabled}
          value={Number.isFinite(display) ? display : 0}
          onChange={(e) => onChange(fromDisplayValue(Number(e.target.value), displayUnit))}
          className="h-11 w-full rounded-lg border border-white/10 bg-[#070B14] px-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-[#4F8CFF]/40 focus:ring-[#4F8CFF]/30 disabled:cursor-not-allowed"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8EA0BA]">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}
