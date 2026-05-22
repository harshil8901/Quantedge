'use client';

import { cn } from '@/lib/utils';
import type { DataInputMode } from '@/lib/financial-modeling';

type Props = {
  mode: DataInputMode;
  onChange: (mode: DataInputMode) => void;
  accent?: string;
};

const MODES: Array<{ key: DataInputMode; label: string; hint: string }> = [
  { key: 'api', label: 'API Fetch', hint: 'Load live financials' },
  { key: 'hybrid', label: 'Hybrid', hint: 'Fetch then edit' },
  { key: 'manual', label: 'Manual', hint: 'Full analyst entry' },
];

export default function DataModeToggle({ mode, onChange, accent = '#4F8CFF' }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
              mode === key ? 'text-white' : 'border-white/[0.08] bg-[#070D19] text-[#A1AAB8] hover:border-white/15',
            )}
            style={
              mode === key
                ? { borderColor: `${accent}66`, backgroundColor: `${accent}1A` }
                : undefined
            }
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-[#6F7F91]">{MODES.find((m) => m.key === mode)?.hint}</p>
    </div>
  );
}
