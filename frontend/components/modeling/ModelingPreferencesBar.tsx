'use client';

import { RefreshCcw } from 'lucide-react';
import { CURRENCY_OPTIONS, UNIT_OPTIONS, type CurrencyCode, type UnitScale } from '@/lib/financial-modeling';
import { cn } from '@/lib/utils';

type Props = {
  baseCurrency: CurrencyCode;
  companyCurrency: CurrencyCode;
  displayUnit: UnitScale;
  useLiveFx: boolean;
  fxLoading?: boolean;
  fxRateSample?: string;
  onBaseCurrencyChange: (c: CurrencyCode) => void;
  onCompanyCurrencyChange: (c: CurrencyCode) => void;
  onDisplayUnitChange: (u: UnitScale) => void;
  onRefreshFx: () => void;
  onToggleLiveFx: (live: boolean) => void;
  fxOverride?: number;
  onFxOverrideChange?: (rate: number | undefined) => void;
};

export default function ModelingPreferencesBar({
  baseCurrency,
  companyCurrency,
  displayUnit,
  useLiveFx,
  fxLoading,
  fxRateSample,
  onBaseCurrencyChange,
  onCompanyCurrencyChange,
  onDisplayUnitChange,
  onRefreshFx,
  onToggleLiveFx,
  fxOverride,
  onFxOverrideChange,
}: Props) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#070B14] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8EA0BA]">Global modeling prefs</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs text-[#8EA0BA]">
          Company currency
          <select
            value={companyCurrency}
            onChange={(e) => onCompanyCurrencyChange(e.target.value as CurrencyCode)}
            className="h-10 rounded-lg border border-white/[0.08] bg-[#101725] px-2 text-sm text-white outline-none"
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-[#8EA0BA]">
          Base / display currency
          <select
            value={baseCurrency}
            onChange={(e) => onBaseCurrencyChange(e.target.value as CurrencyCode)}
            className="h-10 rounded-lg border border-white/[0.08] bg-[#101725] px-2 text-sm text-white outline-none"
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-[#8EA0BA]">
          Display units
          <select
            value={displayUnit}
            onChange={(e) => onDisplayUnitChange(e.target.value as UnitScale)}
            className="h-10 rounded-lg border border-white/[0.08] bg-[#101725] px-2 text-sm text-white outline-none"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-1.5 text-xs text-[#8EA0BA]">
          FX source
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleLiveFx(true)}
              className={cn(
                'flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition',
                useLiveFx ? 'border-[#00E5A8]/40 bg-[#00E5A8]/10 text-white' : 'border-white/[0.08] text-[#8EA0BA]',
              )}
            >
              Live FX
            </button>
            <button
              type="button"
              onClick={() => onToggleLiveFx(false)}
              className={cn(
                'flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition',
                !useLiveFx ? 'border-[#F5B942]/40 bg-[#F5B942]/10 text-white' : 'border-white/[0.08] text-[#8EA0BA]',
              )}
            >
              Manual FX
            </button>
            <button
              type="button"
              onClick={onRefreshFx}
              className="rounded-lg border border-white/[0.08] p-2 text-[#8EA0BA] hover:text-white"
              aria-label="Refresh FX"
            >
              <RefreshCcw size={14} className={fxLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>
      {companyCurrency !== baseCurrency && onFxOverrideChange ? (
        <label className="mt-3 grid gap-1.5 text-xs text-[#8EA0BA]">
          Manual rate ({companyCurrency} → {baseCurrency})
          <input
            type="number"
            step="0.0001"
            value={fxOverride ?? ''}
            placeholder={fxRateSample ?? 'Live rate'}
            onChange={(e) =>
              onFxOverrideChange(e.target.value ? Number(e.target.value) : undefined)
            }
            className="h-10 rounded-lg border border-white/[0.08] bg-[#101725] px-3 text-sm text-white outline-none"
          />
        </label>
      ) : null}
      <p className="mt-2 text-[10px] leading-relaxed text-[#6F7F91]">
        Raw values are stored in company currency. Display scales apply to inputs only. Assumptions auto-save locally.
      </p>
    </div>
  );
}
