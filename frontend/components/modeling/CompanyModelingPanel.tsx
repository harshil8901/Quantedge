'use client';

import { RefreshCcw, Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import DataModeToggle from '@/components/modeling/DataModeToggle';
import ModelingPreferencesBar from '@/components/modeling/ModelingPreferencesBar';
import FinancialNumberField from '@/components/modeling/FinancialNumberField';
import type { CompanyProfile } from '@/lib/financial-modeling';
import type { useModelingWorkspace } from '@/hooks/useModelingWorkspace';

type Workspace = ReturnType<typeof useModelingWorkspace>;

type Props = {
  title?: string;
  sectionLabel?: string;
  accent?: string;
  workspace: Workspace;
  onFetch: () => void;
  fetchPending?: boolean;
  fetchError?: string | null;
  extraFields?: React.ReactNode;
  showTickerFetch?: boolean;
};

const CORE_FIELDS: Array<{ key: keyof CompanyProfile; label: string; step?: number; suffix?: string; isMoney?: boolean }> = [
  { key: 'stockPrice', label: 'Stock price', step: 0.01, isMoney: false },
  { key: 'sharesOutstanding', label: 'Shares outstanding', step: 100_000, isMoney: false },
  { key: 'revenue', label: 'Revenue', isMoney: true },
  { key: 'ebitda', label: 'EBITDA', isMoney: true },
  { key: 'ebit', label: 'EBIT', isMoney: true },
  { key: 'netIncome', label: 'Net income', isMoney: true },
  { key: 'cash', label: 'Cash', isMoney: true },
  { key: 'debt', label: 'Debt', isMoney: true },
  { key: 'workingCapital', label: 'Working capital', isMoney: true },
  { key: 'freeCashFlow', label: 'Free cash flow', isMoney: true },
  { key: 'capex', label: 'CapEx', isMoney: true },
  { key: 'historicalRevenueGrowth', label: 'Revenue growth %', step: 0.1, suffix: '%' },
  { key: 'historicalEbitdaMargin', label: 'EBITDA margin %', step: 0.1, suffix: '%' },
];

export default function CompanyModelingPanel({
  title = 'Company data',
  sectionLabel = 'Inputs',
  accent = '#4F8CFF',
  workspace,
  onFetch,
  fetchPending,
  fetchError,
  extraFields,
  showTickerFetch = true,
}: Props) {
  const {
    tickerQuery,
    setTickerQuery,
    company,
    preferences,
    fxLoading,
    setInputMode,
    setBaseCurrency,
    setCompanyCurrency,
    setDisplayUnit,
    setFxOverride,
    refreshFxRates,
    updateCompanyField,
    fieldsLocked,
  } = workspace;

  const showFetch = preferences.inputMode !== 'manual';
  const showFullForm = preferences.inputMode !== 'api' || !fieldsLocked;
  const fxPair = `${company.currency}_${preferences.baseCurrency}`;
  const liveRate =
    company.currency !== preferences.baseCurrency && preferences.fxRates[company.currency]
      ? (preferences.fxRates[preferences.baseCurrency] ?? 1) / (preferences.fxRates[company.currency] ?? 1)
      : undefined;

  return (
    <Panel className="p-5">
      <p className="text-xs uppercase tracking-[0.24em]" style={{ color: accent }}>
        {sectionLabel}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>

      <div className="mt-4">
        <DataModeToggle mode={preferences.inputMode} onChange={setInputMode} accent={accent} />
      </div>

      <div className="mt-4">
        <ModelingPreferencesBar
          baseCurrency={preferences.baseCurrency}
          companyCurrency={company.currency}
          displayUnit={preferences.displayUnit}
          useLiveFx={preferences.useLiveFx}
          fxLoading={fxLoading}
          fxRateSample={liveRate != null ? String(round(liveRate, 4)) : undefined}
          onBaseCurrencyChange={setBaseCurrency}
          onCompanyCurrencyChange={setCompanyCurrency}
          onDisplayUnitChange={setDisplayUnit}
          onRefreshFx={refreshFxRates}
          onToggleLiveFx={(live) =>
            workspace.setPreferences((p) => ({ ...p, useLiveFx: live }))
          }
          fxOverride={preferences.fxOverrides[fxPair]}
          onFxOverrideChange={(rate) => setFxOverride(fxPair, rate)}
        />
      </div>

      {showTickerFetch && showFetch ? (
        <div className="mt-4 flex items-center gap-2">
          <div className="flex w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-[#070D19] px-3 py-2">
            <Search size={16} className="text-[#8EA0BA]" />
            <input
              value={tickerQuery}
              onChange={(e) => setTickerQuery(e.target.value.toUpperCase())}
              className="w-full bg-transparent text-sm text-white outline-none"
              placeholder="Ticker or leave blank for manual-only"
            />
          </div>
          <Button type="button" onClick={onFetch} disabled={fetchPending || !tickerQuery.trim()} variant="secondary">
            <RefreshCcw size={14} className={fetchPending ? 'animate-spin' : ''} />
          </Button>
        </div>
      ) : null}

      {fetchError ? <p className="mt-3 text-sm text-[#FF7A90]">{fetchError}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs text-[#8EA0BA] sm:col-span-2">
          Company name
          <input
            value={company.companyName}
            onChange={(e) => updateCompanyField('companyName', e.target.value)}
            className="h-10 rounded-lg border border-white/[0.08] bg-[#070B14] px-3 text-sm text-white outline-none"
            placeholder="PrivateCo Inc."
          />
        </label>
        <label className="grid gap-1.5 text-xs text-[#8EA0BA]">
          Ticker (optional)
          <input
            value={company.ticker}
            onChange={(e) => updateCompanyField('ticker', e.target.value.toUpperCase())}
            className="h-10 rounded-lg border border-white/[0.08] bg-[#070B14] px-3 text-sm text-white outline-none"
          />
        </label>
        <label className="grid gap-1.5 text-xs text-[#8EA0BA]">
          Industry
          <input
            value={company.industry}
            onChange={(e) => updateCompanyField('industry', e.target.value)}
            className="h-10 rounded-lg border border-white/[0.08] bg-[#070B14] px-3 text-sm text-white outline-none"
          />
        </label>
        <label className="grid gap-1.5 text-xs text-[#8EA0BA] sm:col-span-2">
          Region
          <input
            value={company.region}
            onChange={(e) => updateCompanyField('region', e.target.value)}
            className="h-10 rounded-lg border border-white/[0.08] bg-[#070B14] px-3 text-sm text-white outline-none"
            placeholder="North America, EMEA, APAC…"
          />
        </label>
      </div>

      {showFullForm ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CORE_FIELDS.map(({ key, label, step, suffix, isMoney }) => (
            <FinancialNumberField
              key={key}
              label={label}
              rawValue={company[key] as number}
              onChange={(v) => updateCompanyField(key, v as CompanyProfile[typeof key])}
              displayUnit={isMoney ? preferences.displayUnit : 'raw'}
              step={step}
              suffix={suffix}
            />
          ))}
          {extraFields}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#8EA0BA]">
          API-only view: switch to Hybrid or Manual to edit assumptions. Fetch updates all fields.
        </p>
      )}

      {preferences.inputMode === 'hybrid' ? (
        <p className="mt-3 text-xs text-[#6F7F91]">
          Hybrid mode: fetch API data, then override any field for professional modeling.
        </p>
      ) : null}
    </Panel>
  );
}

function round(n: number, d: number) {
  return Number(n.toFixed(d));
}
