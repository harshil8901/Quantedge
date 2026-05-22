'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ModelingToolbar from '@/components/modeling/ModelingToolbar';
import { useModelingWorkspace } from '@/hooks/useModelingWorkspace';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { BrainCircuit, RefreshCcw, Sparkles, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartFrame from '@/components/charts/ChartFrame';
import ClientChart from '@/components/charts/ClientChart';
import NumberField from '@/components/forms/NumberField';
import RangeField from '@/components/forms/RangeField';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import { formatCurrency, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type DDMScenarioKey = 'bear' | 'base' | 'bull';

type DDMScenarioAssumptions = {
  dividendGrowth: number;
  costOfEquity: number;
  stableGrowth: number;
  forecastYears: number;
};

type DDMCompanyInputs = {
  ticker: string;
  companyName: string;
  currentPrice: number;
  marketCap: number;
  beta: number;
  dividendPerShare: number;
  dividendYield: number;
  payoutRatio: number;
  eps: number;
  netIncome: number;
  sharesOutstanding: number;
};

type DDMHistoricalPoint = {
  year: number;
  dividend: number;
  payoutRatio: number | null;
  yieldPercent: number | null;
};

type DDMScenarioOutput = {
  label: 'Bear' | 'Base' | 'Bull';
  scenarioKey: DDMScenarioKey;
  assumptions: DDMScenarioAssumptions;
  intrinsicValue: number;
  terminalValue: number;
  terminalValuePv: number;
  projectedYield: number;
  upsideDownsidePercent: number;
  summary: string;
};

type DDMValuationResult = {
  company: DDMCompanyInputs;
  historical: DDMHistoricalPoint[];
  historicalStats: {
    dividendCagr: number;
    averagePayoutRatio: number;
    averageYield: number;
  };
  scenarios: {
    bear: DDMScenarioOutput;
    base: DDMScenarioOutput;
    bull: DDMScenarioOutput;
  };
  insights: string[];
  charts: {
    dividendProjection: Array<{ year: string; bear: number; base: number; bull: number }>;
    yieldTrend: Array<{ year: number; yieldPercent: number }>;
    scenarioComparison: Array<{ label: string; intrinsicValue: number; currentPrice: number }>;
    sensitivityMatrix: Array<{ costOfEquity: number; stableGrowth: number; intrinsicValue: number }>;
  };
};

type WorkspaceResponse = {
  company: DDMCompanyInputs;
  historical: DDMHistoricalPoint[];
  suggestedAssumptions: Record<DDMScenarioKey, DDMScenarioAssumptions>;
};

const DEFAULT_DDM_ASSUMPTIONS: Record<DDMScenarioKey, DDMScenarioAssumptions> = {
  bear: { dividendGrowth: 2, costOfEquity: 11, stableGrowth: 1.5, forecastYears: 5 },
  base: { dividendGrowth: 5, costOfEquity: 9, stableGrowth: 3, forecastYears: 5 },
  bull: { dividendGrowth: 8, costOfEquity: 8, stableGrowth: 4, forecastYears: 5 },
};

const DEFAULT_DDM_COMPANY: DDMCompanyInputs = {
  ticker: 'PRIVATE',
  companyName: 'Custom Company',
  currentPrice: 100,
  marketCap: 10_000_000_000,
  beta: 1,
  dividendPerShare: 2.5,
  dividendYield: 2.5,
  payoutRatio: 40,
  eps: 6,
  netIncome: 600_000_000,
  sharesOutstanding: 100_000_000,
};

const SCENARIO_META: Array<{ key: DDMScenarioKey; label: string; accent: string }> = [
  { key: 'bear', label: 'Bear', accent: '#FF6B6B' },
  { key: 'base', label: 'Base', accent: '#4F8CFF' },
  { key: 'bull', label: 'Bull', accent: '#00C896' },
];

type ChartTooltipPayload = { value?: number | string; name?: string; dataKey?: string | number };

type DDMChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ChartTooltipPayload[];
  valueFormatter?: (value: number) => string;
};

function DDMChartTooltip({ active, payload, label, valueFormatter }: DDMChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#101725] px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      {label ? <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#8EA0BA]">{label}</p> : null}
      {payload.map((entry) => {
        const raw = entry.value;
        const numeric = typeof raw === 'number' ? raw : Number(raw ?? 0);
        const formatted = valueFormatter ? valueFormatter(numeric) : String(raw ?? '—');
        return (
          <p key={String(entry.dataKey ?? entry.name)} className="text-sm font-medium text-[#E8F0FF]">
            <span className="text-[#8EA0BA]">{entry.name ?? 'Value'}: </span>
            {formatted}
          </p>
        );
      })}
    </div>
  );
}

function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#070B14] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8EA0BA]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-[#6F7F91]">{sub}</p> : null}
    </div>
  );
}

function ScenarioCard({ scenario, accent }: { scenario: DDMScenarioOutput; accent: string }) {
  const upside = scenario.upsideDownsidePercent;
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: `0 20px 50px ${accent}22` }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101725] p-5"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ background: `radial-gradient(circle at top right, ${accent}55, transparent 55%)` }}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8EA0BA]">{scenario.label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{formatCurrency(scenario.intrinsicValue, false)}</p>
      <p className="mt-1 text-xs text-[#8EA0BA]">
        {formatPercent(scenario.assumptions.dividendGrowth)} growth · {formatPercent(scenario.assumptions.costOfEquity)} cost of equity
      </p>
      <p className={cn('mt-3 text-sm font-semibold', upside >= 0 ? 'text-[#00C896]' : 'text-[#FF6B6B]')}>
        {upside >= 0 ? '+' : ''}
        {formatPercent(upside)} vs market
      </p>
      <p className="mt-3 text-xs leading-5 text-[#94A4BE]">{scenario.summary}</p>
    </motion.div>
  );
}

async function fetchWorkspace(ticker: string): Promise<WorkspaceResponse> {
  const response = await fetch(`${API_URL}/api/valuation/company/dividend/${encodeURIComponent(ticker)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch dividend discount workspace.');
  }
  return response.json();
}

async function runDDMValuation(payload: {
  company: DDMCompanyInputs;
  assumptions: Record<DDMScenarioKey, DDMScenarioAssumptions>;
  historical: DDMHistoricalPoint[];
}): Promise<DDMValuationResult> {
  const response = await fetch(`${API_URL}/api/valuation/ddm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to calculate dividend discount valuation.');
  }
  return response.json();
}

export default function DDMValuation() {
  const workspace = useModelingWorkspace('ddm');
  const [company, setCompany] = useState<DDMCompanyInputs | null>(null);
  const [historical, setHistorical] = useState<DDMHistoricalPoint[]>([]);
  const [assumptions, setAssumptions] = useState<Record<DDMScenarioKey, DDMScenarioAssumptions> | null>(null);
  const [activeScenario, setActiveScenario] = useState<DDMScenarioKey>('base');

  useEffect(() => {
    if (workspace.preferences.inputMode !== 'manual' || company) return;
    setCompany({
      ...DEFAULT_DDM_COMPANY,
      companyName: workspace.company.companyName || DEFAULT_DDM_COMPANY.companyName,
      ticker: workspace.company.ticker || DEFAULT_DDM_COMPANY.ticker,
    });
    setAssumptions(DEFAULT_DDM_ASSUMPTIONS);
  }, [workspace.preferences.inputMode, workspace.company.companyName, workspace.company.ticker, company]);

  const workspaceMutation = useMutation({
    mutationFn: fetchWorkspace,
    onSuccess: (data) => {
      workspace.applyApiCompany(data.company as unknown as Record<string, unknown>);
      workspace.setTickerQuery(data.company.ticker);
      setCompany(data.company);
      setHistorical(data.historical);
      setAssumptions(data.suggestedAssumptions);
      valuationMutation.reset();
    },
  });

  const valuationMutation = useMutation({ mutationFn: runDDMValuation });

  const result = valuationMutation.data;
  const showResults = valuationMutation.isSuccess && Boolean(result);

  const runValuation = useCallback(() => {
    if (!company || !assumptions) return;
    valuationMutation.mutate({ company, assumptions, historical });
  }, [company, assumptions, historical, valuationMutation]);

  const updateAssumption = (
    scenario: DDMScenarioKey,
    field: keyof DDMScenarioAssumptions,
    value: number,
  ) => {
    setAssumptions((prev) => {
      if (!prev) return prev;
      return { ...prev, [scenario]: { ...prev[scenario], [field]: value } };
    });
    valuationMutation.reset();
  };

  const sensitivityGrid = useMemo(() => {
    if (!result?.charts.sensitivityMatrix.length) return null;
    const rows = [...new Set(result.charts.sensitivityMatrix.map((c) => c.costOfEquity))].sort((a, b) => a - b);
    const cols = [...new Set(result.charts.sensitivityMatrix.map((c) => c.stableGrowth))].sort((a, b) => a - b);
    const lookup = new Map(
      result.charts.sensitivityMatrix.map((c) => [`${c.costOfEquity}-${c.stableGrowth}`, c.intrinsicValue]),
    );
    const values = result.charts.sensitivityMatrix.map((c) => c.intrinsicValue).filter((v) => v > 0);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    return { rows, cols, lookup, min, max };
  }, [result]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-6 xl:grid-cols-[400px_1fr]">
      <motion.div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <ModelingToolbar
          workspace={workspace}
          accent="#F5B942"
          title="Target company"
          onFetch={() => workspaceMutation.mutate(workspace.tickerQuery)}
          fetchPending={workspaceMutation.isPending}
          fetchError={workspaceMutation.error?.message ?? null}
        />

        <Panel className="overflow-hidden p-5">
          <motion.div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#F5B942]">DDM Terminal</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Dividend inputs</h2>
            </div>
            <Sparkles size={18} className="text-[#F5B942]" />
          </motion.div>

          <AnimatePresence mode="wait">
            {company ? (
              <motion.div
                key={company.ticker}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 space-y-3"
              >
                <div className="rounded-xl border border-[#F5B942]/20 bg-gradient-to-br from-[#101725] to-[#070B14] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <motion.div>
                      <p className="text-lg font-semibold text-white">{company.companyName}</p>
                      <p className="text-sm text-[#8EA0BA]">{company.ticker}</p>
                    </motion.div>
                    <span className="rounded-full border border-[#F5B942]/30 bg-[#F5B942]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#F5B942]">
                      Auto-fetched
                    </span>
                  </div>
                  <motion.div className="mt-4 grid grid-cols-2 gap-2">
                    <MetricTile label="Price" value={formatCurrency(company.currentPrice, false)} />
                    <MetricTile label="DPS" value={formatCurrency(company.dividendPerShare, false)} />
                    <MetricTile label="Yield" value={formatPercent(company.dividendYield)} />
                    <MetricTile label="Payout" value={formatPercent(company.payoutRatio)} />
                    <MetricTile label="Beta" value={company.beta.toFixed(2)} />
                    <MetricTile label="EPS" value={formatCurrency(company.eps, false)} />
                  </motion.div>
                  <NumberField
                    label="Dividend per share (override)"
                    value={company.dividendPerShare}
                    onChange={(value) => {
                      setCompany((prev) => (prev ? { ...prev, dividendPerShare: value } : prev));
                      valuationMutation.reset();
                    }}
                    step={0.01}
                    compact
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => workspaceMutation.mutate(company.ticker)}
                    disabled={workspaceMutation.isPending}
                  >
                    <RefreshCcw size={14} className={workspaceMutation.isPending ? 'animate-spin' : ''} />
                    Refresh data
                  </Button>
                </div>
              </motion.div>
            ) : (
              <p className="mt-5 text-sm text-[#8EA0BA]">Enter a ticker to auto-fetch dividends, payout, and yield from FMP.</p>
            )}
          </AnimatePresence>
        </Panel>

        {assumptions ? (
          <Panel className="p-5">
            <h3 className="text-sm font-semibold text-white">Scenario assumptions</h3>
            <p className="mt-1 text-xs text-[#6F7F91]">Multi-stage DDM · Gordon terminal value</p>
            <motion.div className="mt-4 flex gap-2">
              {SCENARIO_META.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveScenario(item.key)}
                  className={cn(
                    'flex-1 rounded-xl border px-2 py-2 text-[11px] font-semibold transition',
                    activeScenario === item.key
                      ? 'border-[#F5B942]/50 bg-[#F5B942]/15 text-white'
                      : 'border-white/[0.08] bg-[#070B14] text-[#8EA0BA] hover:border-white/15',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
            <div className="mt-4 grid gap-4">
              <RangeField
                label="Dividend growth"
                value={assumptions[activeScenario].dividendGrowth}
                onChange={(value) => updateAssumption(activeScenario, 'dividendGrowth', value)}
                min={0}
                max={12}
                step={0.25}
              />
              <RangeField
                label="Cost of equity"
                value={assumptions[activeScenario].costOfEquity}
                onChange={(value) => updateAssumption(activeScenario, 'costOfEquity', value)}
                min={6}
                max={18}
                step={0.25}
              />
              <RangeField
                label="Stable growth"
                value={assumptions[activeScenario].stableGrowth}
                onChange={(value) => updateAssumption(activeScenario, 'stableGrowth', value)}
                min={1}
                max={6}
                step={0.25}
              />
              <NumberField
                label="Forecast years"
                value={assumptions[activeScenario].forecastYears}
                onChange={(value) => updateAssumption(activeScenario, 'forecastYears', value)}
                step={1}
                min={3}
                max={15}
              />
            </div>
            <Button
              type="button"
              onClick={runValuation}
              disabled={!company || valuationMutation.isPending}
              className="mt-6 w-full"
            >
              {valuationMutation.isPending ? 'Running DDM…' : 'Run dividend valuation'}
            </Button>
            {valuationMutation.error ? (
              <p className="mt-3 text-sm text-[#FF6B6B]">{valuationMutation.error.message}</p>
            ) : null}
          </Panel>
        ) : null}
      </motion.div>

      <div className="space-y-6">
        {!showResults ? (
          <Panel className="flex min-h-[420px] flex-col items-center justify-center p-10 text-center">
            <TrendingUp size={40} className="text-[#F5B942]/60" />
            <h3 className="mt-6 text-xl font-semibold text-white">Dividend discount workspace</h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-[#8EA0BA]">
              Load a dividend-paying company, tune bear / base / bull assumptions, then run the multi-stage DDM to project
              payouts, terminal value, and fair value sensitivity.
            </p>
          </Panel>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {SCENARIO_META.map((meta) => (
                <ScenarioCard key={meta.key} scenario={result!.scenarios[meta.key]} accent={meta.accent} />
              ))}
            </div>

            <Panel className="p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Historical context</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Payout & yield trends</h3>
                </div>
                <motion.div className="flex gap-4 text-sm">
                  <span className="text-[#8EA0BA]">
                    CAGR <span className="font-semibold text-white">{formatPercent(result!.historicalStats.dividendCagr)}</span>
                  </span>
                  <span className="text-[#8EA0BA]">
                    Avg yield{' '}
                    <span className="font-semibold text-white">{formatPercent(result!.historicalStats.averageYield)}</span>
                  </span>
                </motion.div>
              </div>
              {result!.historical.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wider text-[#8EA0BA]">
                        <th className="py-2 pr-4">Year</th>
                        <th className="py-2 pr-4">Dividend</th>
                        <th className="py-2 pr-4">Payout</th>
                        <th className="py-2">Yield</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result!.historical.map((row) => (
                        <tr key={row.year} className="border-b border-white/[0.04] text-[#E8F0FF]">
                          <td className="py-2.5 pr-4">{row.year}</td>
                          <td className="py-2.5 pr-4">{formatCurrency(row.dividend, false)}</td>
                          <td className="py-2.5 pr-4">{row.payoutRatio != null ? formatPercent(row.payoutRatio) : '—'}</td>
                          <td className="py-2.5">{row.yieldPercent != null ? formatPercent(row.yieldPercent) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#8EA0BA]">No historical dividend series returned from provider.</p>
              )}
            </Panel>

            <div className="grid gap-5 lg:grid-cols-2">
              <ChartFrame title="Dividend projection" subtitle="Bear · base · bull forecast path">
                <ClientChart className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result!.charts.dividendProjection}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="year" stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <YAxis stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <Tooltip content={<DDMChartTooltip valueFormatter={(v) => formatCurrency(v, false)} />} />
                      <Legend />
                      <Line type="monotone" dataKey="bear" name="Bear" stroke="#FF6B6B" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="base" name="Base" stroke="#4F8CFF" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="bull" name="Bull" stroke="#00C896" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>

              <ChartFrame title="Yield trend" subtitle="Historical dividend yield">
                <ClientChart className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result!.charts.yieldTrend}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="year" stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <YAxis stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <Tooltip content={<DDMChartTooltip valueFormatter={(v) => formatPercent(v)} />} />
                      <Line type="monotone" dataKey="yieldPercent" name="Yield %" stroke="#F5B942" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <ChartFrame title="Scenario fair value" subtitle="Intrinsic vs current price">
                <ClientChart className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result!.charts.scenarioComparison}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <YAxis stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <Tooltip content={<DDMChartTooltip valueFormatter={(v) => formatCurrency(v, false)} />} />
                      <Bar dataKey="intrinsicValue" name="Intrinsic" fill="#4F8CFF" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="currentPrice" name="Market" fill="#6F7F91" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>

              {sensitivityGrid ? (
                <Panel className="p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Sensitivity</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Cost of equity × stable growth</h3>
                  <p className="mt-1 text-xs text-[#6F7F91]">Base-case dividend growth held constant</p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-center text-xs">
                      <thead>
                        <tr>
                          <th className="p-2 text-[#8EA0BA]">r \ g</th>
                          {sensitivityGrid.cols.map((col) => (
                            <th key={col} className="p-2 text-[#8EA0BA]">
                              {formatPercent(col)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sensitivityGrid.rows.map((row) => (
                          <tr key={row}>
                            <td className="p-2 font-semibold text-[#8EA0BA]">{formatPercent(row)}</td>
                            {sensitivityGrid.cols.map((col) => {
                              const value = sensitivityGrid.lookup.get(`${row}-${col}`) ?? 0;
                              const t =
                                sensitivityGrid.max > sensitivityGrid.min
                                  ? (value - sensitivityGrid.min) / (sensitivityGrid.max - sensitivityGrid.min)
                                  : 0.5;
                              return (
                                <td
                                  key={`${row}-${col}`}
                                  className="p-2 font-medium text-white"
                                  style={{ background: `rgba(79, 140, 255, ${0.12 + t * 0.45})` }}
                                >
                                  {value > 0 ? formatCurrency(value, false) : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              ) : null}
            </div>

            {result!.insights.length > 0 ? (
              <Panel className="p-5">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={18} className="text-[#F5B942]" />
                  <h3 className="text-sm font-semibold text-white">Institutional insights</h3>
                </div>
                <ul className="mt-4 space-y-3">
                  {result!.insights.map((insight) => (
                    <li key={insight} className="flex gap-3 text-sm leading-6 text-[#94A4BE]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5B942]" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </>
        )}
      </div>
    </motion.div>
  );
}
