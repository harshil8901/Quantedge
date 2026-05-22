'use client';

import { RefreshCcw, Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import DataModeToggle from '@/components/modeling/DataModeToggle';
import ModelingPreferencesBar from '@/components/modeling/ModelingPreferencesBar';
import type { useModelingWorkspace } from '@/hooks/useModelingWorkspace';

type Workspace = ReturnType<typeof useModelingWorkspace>;

type Props = {
  workspace: Workspace;
  accent?: string;
  onFetch?: () => void;
  fetchPending?: boolean;
  fetchError?: string | null;
  showTicker?: boolean;
  title?: string;
};

export default function ModelingToolbar({
  workspace,
  accent = '#4F8CFF',
  onFetch,
  fetchPending,
  fetchError,
  showTicker = true,
  title = 'Data & modeling',
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
  } = workspace;

  const fxPair = `${company.currency}_${preferences.baseCurrency}`;
  const liveRate =
    company.currency !== preferences.baseCurrency && preferences.fxRates[company.currency]
      ? (preferences.fxRates[preferences.baseCurrency] ?? 1) / (preferences.fxRates[company.currency] ?? 1)
      : undefined;

  return (
    <Panel className="p-5">
      <p className="text-xs uppercase tracking-[0.24em]" style={{ color: accent }}>
        Modeling controls
      </p>
      <h2 className="mt-2 text-lg font-semibold text-white">{title}</h2>

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
          fxRateSample={liveRate != null ? String(Number(liveRate.toFixed(4))) : undefined}
          onBaseCurrencyChange={setBaseCurrency}
          onCompanyCurrencyChange={setCompanyCurrency}
          onDisplayUnitChange={setDisplayUnit}
          onRefreshFx={refreshFxRates}
          onToggleLiveFx={(live) => workspace.setPreferences((p) => ({ ...p, useLiveFx: live }))}
          fxOverride={preferences.fxOverrides[fxPair]}
          onFxOverrideChange={(rate) => setFxOverride(fxPair, rate)}
        />
      </div>

      {showTicker && preferences.inputMode !== 'manual' && onFetch ? (
        <div className="mt-4 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#070D19] px-3 py-2">
            <Search size={16} className="text-[#8EA0BA]" />
            <input
              value={tickerQuery}
              onChange={(e) => setTickerQuery(e.target.value.toUpperCase())}
              className="w-full bg-transparent text-sm text-white outline-none"
              placeholder="Ticker symbol"
            />
          </div>
          <Button type="button" variant="secondary" onClick={onFetch} disabled={fetchPending || !tickerQuery.trim()}>
            <RefreshCcw size={14} className={fetchPending ? 'animate-spin' : ''} />
          </Button>
        </div>
      ) : null}

      {fetchError ? <p className="mt-3 text-sm text-[#FF7A90]">{fetchError}</p> : null}

      {preferences.inputMode === 'manual' ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs text-[#8EA0BA] sm:col-span-2">
            Company name
            <input
              value={company.companyName}
              onChange={(e) => workspace.updateCompanyField('companyName', e.target.value)}
              className="h-10 rounded-lg border border-white/[0.08] bg-[#070B14] px-3 text-sm text-white outline-none"
            />
          </label>
          <label className="grid gap-1 text-xs text-[#8EA0BA]">
            Industry
            <input
              value={company.industry}
              onChange={(e) => workspace.updateCompanyField('industry', e.target.value)}
              className="h-10 rounded-lg border border-white/[0.08] bg-[#070B14] px-3 text-sm text-white outline-none"
            />
          </label>
          <label className="grid gap-1 text-xs text-[#8EA0BA]">
            Region
            <input
              value={company.region}
              onChange={(e) => workspace.updateCompanyField('region', e.target.value)}
              className="h-10 rounded-lg border border-white/[0.08] bg-[#070B14] px-3 text-sm text-white outline-none"
            />
          </label>
        </div>
      ) : null}
    </Panel>
  );
}
