'use client';

interface RangeFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}

export default function RangeField({ label, value, onChange, min, max, step, suffix = '%' }: RangeFieldProps) {
  return (
    <label className="grid gap-3 text-sm text-[#A1AAB8]">
      <span className="flex items-center justify-between gap-4">
        <span>{label}</span>
        <span className="font-semibold text-white">
          {value.toFixed(step < 1 ? 1 : 0)}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#4F8CFF]"
      />
    </label>
  );
}
