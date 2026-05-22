'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ModelingToolbar from '@/components/modeling/ModelingToolbar';
import { useModelingWorkspace } from '@/hooks/useModelingWorkspace';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { BrainCircuit, RefreshCcw, Sparkles, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
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

type RIMScenarioKey = 'bear' | 'base' | 'bull';

type RIMScenarioAssumptions = {
  futureROE: number;
  costOfEquity: number;
  growth: number;
  forecastYears: number;
};

type RIMCompanyInputs = {
  ticker: string;
  companyName: string;
  currentPrice: number;
  marketCap: number;
  beta: number;
  sharesOutstanding: number;
  shareholderEquity: number;
  bookValuePerShare: number;
  retainedEarnings: number;
  netIncome: number;
  eps: number;
  roe: number;
  revenueGrowth: number;
};

type RIMHistoricalPoint = {
  year: number;
  roe: number;
  netIncome: number;
  bookValue: number;
  bookValuePerShare: number;
  retainedEarnings: number;
  revenueGrowth: number | null;
};

type RIMScenarioOutput = {
  label: 'Bear' | 'Base' | 'Bull';
  scenarioKey: RIMScenarioKey;
  assumptions: RIMScenarioAssumptions;
  intrinsicValue: number;
  intrinsicValuePerShare: number;
  bookValueComponent: number;
  pvResidualIncome: number;
  averageRoeSpread: number;
  cumulativeEconomicProfit: number;
  upsideDownsidePercent: number;
  summary: string;
};

type RIMValuationResult = {
  company: RIMCompanyInputs;
  historical: RIMHistoricalPoint[];
  historicalStats: {
    averageRoe: number;
    bookValueCagr: number;
    netIncomeCagr: number;
    averageRevenueGrowth: number;
  };
  scenarios: {
    bear: RIMScenarioOutput;
    base: RIMScenarioOutput;
    bull: RIMScenarioOutput;
  };
  insights: string[];
  charts: {
    roeVsCostOfEquity: Array<{ year: string; roe: number; costOfEquity: number }>;
    residualIncomeProjection: Array<{ year: string; bear: number; base: number; bull: number }>;
    bookValueGrowth: Array<{ year: string; bear: number; base: number; bull: number }>;
    economicProfitTrend: Array<{ year: string; bear: number; base: number; bull: number }>;
    scenarioComparison: Array<{ label: string; intrinsicValue: number; currentPrice: number }>;
  };
};

type WorkspaceResponse = {
  company: RIMCompanyInputs;
  historical: RIMHistoricalPoint[];
  suggestedAssumptions: Record<RIMScenarioKey, RIMScenarioAssumptions>;
};

const DEFAULT_RIM_ASSUMPTIONS: Record<RIMScenarioKey, RIMScenarioAssumptions> = {
  bear: { futureROE: 10, costOfEquity: 12, growth: 2, forecastYears: 5 },
  base: { futureROE: 14, costOfEquity: 10, growth: 4, forecastYears: 5 },
  bull: { futureROE: 18, costOfEquity: 9, growth: 6, forecastYears: 5 },
};

const DEFAULT_RIM_COMPANY: RIMCompanyInputs = {
  ticker: 'PRIVATE',
  companyName: 'Custom Company',
  currentPrice: 100,
  marketCap: 10_000_000_000,
  beta: 1,
  sharesOutstanding: 100_000_000,
  shareholderEquity: 5_000_000_000,
  bookValuePerShare: 50,
  retainedEarnings: 2_000_000_000,
  netIncome: 800_000_000,
  eps: 8,
  roe: 16,
  revenueGrowth: 5,
};

const SCENARIO_META: Array<{ key: RIMScenarioKey; label: string; accent: string }> = [
  { key: 'bear', label: 'Bear', accent: '#FF6B6B' },
  { key: 'base', label: 'Base', accent: '#4F8CFF' },
  { key: 'bull', label: 'Bull', accent: '#00C896' },
];

type ChartTooltipPayload = { value?: number | string; name?: string; dataKey?: string | number };

type RIMChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ChartTooltipPayload[];
  valueFormatter?: (value: number) => string;
};

function RIMChartTooltip({ active, payload, label, valueFormatter }: RIMChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/10 bg-[#101725] px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
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
    </motion.div>
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

function ScenarioCard({ scenario, accent }: { scenario: RIMScenarioOutput; accent: string }) {
  const upside = scenario.upsideDownsidePercent;
  const spreadPositive = scenario.averageRoeSpread >= 0;

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: `0 20px 50px ${accent}22` }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101725] p-5"
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ background: `radial-gradient(circle at top right, ${accent}55, transparent 55%)` }}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8EA0BA]">{scenario.label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">
        {formatCurrency(scenario.intrinsicValuePerShare, false)}
      </p>
      <p className="mt-1 text-xs text-[#8EA0BA]">Intrinsic value per share</p>
      <p className="mt-3 text-xs text-[#6F7F91]">
        Book {formatCurrency(scenario.bookValueComponent, true)} + PV(RI){' '}
        {formatCurrency(scenario.pvResidualIncome, true)}
      </p>
      <p className={cn('mt-3 text-sm font-semibold', upside >= 0 ? 'text-[#00C896]' : 'text-[#FF6B6B]')}>
        {upside >= 0 ? '+' : ''}
        {formatPercent(upside)} vs market
      </p>
      <p className={cn('mt-2 text-xs font-medium', spreadPositive ? 'text-[#00C896]' : 'text-[#FF6B6B]')}>
        ROE spread {spreadPositive ? '+' : ''}
        {formatPercent(scenario.averageRoeSpread)}
      </p>
      <p className="mt-3 text-xs leading-5 text-[#94A4BE]">{scenario.summary}</p>
    </motion.div>
  );
}

async function fetchWorkspace(ticker: string): Promise<WorkspaceResponse> {
  const response = await fetch(`${API_URL}/api/valuation/company/rim/${encodeURIComponent(ticker)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch residual income workspace.');
  }
  return response.json();
}

async function runRIMValuation(payload: {
  company: RIMCompanyInputs;
  assumptions: Record<RIMScenarioKey, RIMScenarioAssumptions>;
  historical: RIMHistoricalPoint[];
}): Promise<RIMValuationResult> {
  const response = await fetch(`${API_URL}/api/valuation/rim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to calculate residual income valuation.');
  }
  return response.json();
}

export default function RIMValuation() {
  const workspace = useModelingWorkspace('rim');
  const [company, setCompany] = useState<RIMCompanyInputs | null>(null);
  const [historical, setHistorical] = useState<RIMHistoricalPoint[]>([]);
  const [assumptions, setAssumptions] = useState<Record<RIMScenarioKey, RIMScenarioAssumptions> | null>(null);
  const [activeScenario, setActiveScenario] = useState<RIMScenarioKey>('base');

  useEffect(() => {
    if (workspace.preferences.inputMode !== 'manual' || company) return;
    setCompany({
      ...DEFAULT_RIM_COMPANY,
      companyName: workspace.company.companyName || DEFAULT_RIM_COMPANY.companyName,
      ticker: workspace.company.ticker || DEFAULT_RIM_COMPANY.ticker,
    });
    setAssumptions(DEFAULT_RIM_ASSUMPTIONS);
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

  const valuationMutation = useMutation({ mutationFn: runRIMValuation });

  const result = valuationMutation.data;
  const showResults = valuationMutation.isSuccess && Boolean(result);

  const runValuation = useCallback(() => {
    if (!company || !assumptions) return;
    valuationMutation.mutate({ company, assumptions, historical });
  }, [company, assumptions, historical, valuationMutation]);

  const updateAssumption = (
    scenario: RIMScenarioKey,
    field: keyof RIMScenarioAssumptions,
    value: number,
  ) => {
    setAssumptions((prev) => {
      if (!prev) return prev;
      return { ...prev, [scenario]: { ...prev[scenario], [field]: value } };
    });
    valuationMutation.reset();
  };

  const historicalRoeChart = useMemo(
    () =>
      (result?.historical ?? historical).map((h) => ({
        year: String(h.year),
        roe: h.roe,
        bookValue: h.bookValuePerShare,
      })),
    [result, historical],
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-6 xl:grid-cols-[430px_1fr]">
      <motion.div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <ModelingToolbar
          workspace={workspace}
          accent="#4F8CFF"
          title="Target company"
          onFetch={() => workspaceMutation.mutate(workspace.tickerQuery)}
          fetchPending={workspaceMutation.isPending}
          fetchError={workspaceMutation.error?.message ?? null}
        />

        <Panel className="overflow-hidden p-5">
          <div className="flex items-center justify-between gap-3">
            <motion.div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#4F8CFF]">RIM Terminal</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Equity inputs</h2>
            </motion.div>
            <Sparkles size={18} className="text-[#4F8CFF]" />
          </div>

          <AnimatePresence mode="wait">
            {company ? (
              <motion.div
                key={company.ticker}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 space-y-3"
              >
                <motion.div className="rounded-xl border border-[#4F8CFF]/20 bg-gradient-to-br from-[#101725] to-[#070B14] p-4">
                  <motion.div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-white">{company.companyName}</p>
                      <p className="text-sm text-[#8EA0BA]">{company.ticker}</p>
                    </div>
                    <span className="rounded-full border border-[#4F8CFF]/30 bg-[#4F8CFF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#4F8CFF]">
                      {workspace.preferences.inputMode === 'manual' ? 'Manual' : workspace.preferences.inputMode === 'api' ? 'API' : 'Hybrid'}
                    </span>
                  </motion.div>
                  <motion.div
                    className="mt-4 grid grid-cols-2 gap-2"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.04 } },
                    }}
                  >
                    <MetricTile label="Price" value={formatCurrency(company.currentPrice, false)} />
                    <MetricTile label="BVPS" value={formatCurrency(company.bookValuePerShare, false)} />
                    <MetricTile label="ROE" value={formatPercent(company.roe)} />
                    <MetricTile label="Beta" value={company.beta.toFixed(2)} />
                    <MetricTile label="Equity" value={formatCurrency(company.shareholderEquity, true)} />
                    <MetricTile label="Mkt cap" value={formatCurrency(company.marketCap, true)} />
                  </motion.div>
                  <div className="mt-4 grid gap-3">
                    <NumberField
                      label="Book value per share (override)"
                      value={company.bookValuePerShare}
                      onChange={(value) => {
                        setCompany((prev) =>
                          prev
                            ? {
                                ...prev,
                                bookValuePerShare: value,
                                shareholderEquity: value * prev.sharesOutstanding,
                              }
                            : prev,
                        );
                        valuationMutation.reset();
                      }}
                      step={0.01}
                      compact
                    />
                    <NumberField
                      label="Shareholder equity (override)"
                      value={company.shareholderEquity}
                      onChange={(value) => {
                        setCompany((prev) =>
                          prev
                            ? {
                                ...prev,
                                shareholderEquity: value,
                                bookValuePerShare:
                                  prev.sharesOutstanding > 0 ? value / prev.sharesOutstanding : prev.bookValuePerShare,
                              }
                            : prev,
                        );
                        valuationMutation.reset();
                      }}
                      step={1000000}
                      compact
                    />
                  </div>
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
                </motion.div>
              </motion.div>
            ) : (
              <p className="mt-5 text-sm text-[#8EA0BA]">
                Enter a ticker to auto-fetch equity, profitability, and book value data (FMP with Alpha Vantage fallback).
              </p>
            )}
          </AnimatePresence>
        </Panel>

        {historical.length > 0 ? (
          <Panel className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Historical profitability</p>
            <h3 className="mt-1 text-sm font-semibold text-white">ROE & book value trends</h3>
            <ClientChart className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalRoeChart}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="year" stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 10 }} />
                  <YAxis stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 10 }} />
                  <Tooltip content={<RIMChartTooltip valueFormatter={(v) => formatPercent(v)} />} />
                  <Line type="monotone" dataKey="roe" name="ROE %" stroke="#4F8CFF" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ClientChart>
            <div className="mt-3 max-h-36 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wider text-[#8EA0BA]">
                    <th className="py-1.5 pr-2">Year</th>
                    <th className="py-1.5 pr-2">ROE</th>
                    <th className="py-1.5">BVPS</th>
                  </tr>
                </thead>
                <tbody>
                  {historical.map((row) => (
                    <tr key={row.year} className="border-b border-white/[0.04] text-[#E8F0FF]">
                      <td className="py-1.5 pr-2">{row.year}</td>
                      <td className="py-1.5 pr-2">{formatPercent(row.roe)}</td>
                      <td className="py-1.5">{formatCurrency(row.bookValuePerShare, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : null}

        {assumptions ? (
          <Panel className="p-5">
            <h3 className="text-sm font-semibold text-white">Scenario assumptions</h3>
            <p className="mt-1 text-xs text-[#6F7F91]">Analyst-controlled · RI = NI − (Equity × Ke)</p>
            <div className="mt-4 flex gap-2">
              {SCENARIO_META.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveScenario(item.key)}
                  className={cn(
                    'flex-1 rounded-xl border px-2 py-2 text-[11px] font-semibold transition',
                    activeScenario === item.key
                      ? 'border-[#4F8CFF]/50 bg-[#4F8CFF]/15 text-white'
                      : 'border-white/[0.08] bg-[#070B14] text-[#8EA0BA] hover:border-white/15',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4">
              <RangeField
                label="Future ROE"
                value={assumptions[activeScenario].futureROE}
                onChange={(value) => updateAssumption(activeScenario, 'futureROE', value)}
                min={-5}
                max={35}
                step={0.5}
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
                label="Book value growth"
                value={assumptions[activeScenario].growth}
                onChange={(value) => updateAssumption(activeScenario, 'growth', value)}
                min={-5}
                max={15}
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
              {valuationMutation.isPending ? 'Running RIM…' : 'Run residual income valuation'}
            </Button>
            {valuationMutation.error ? (
              <p className="mt-3 text-sm text-[#FF6B6B]">{valuationMutation.error.message}</p>
            ) : null}
          </Panel>
        ) : null}
      </motion.div>

      <div className="space-y-6">
        {!showResults ? (
          <Panel className="flex min-h-[480px] flex-col items-center justify-center p-10 text-center">
            <TrendingUp size={40} className="text-[#4F8CFF]/60" />
            <h3 className="mt-6 text-xl font-semibold text-white">Residual income workspace</h3>
            <p className="mt-3 max-w-lg text-sm leading-7 text-[#8EA0BA]">
              Load a company to review historical ROE and book value trends, configure bear / base / bull scenarios,
              and quantify economic profit above the equity charge with institutional-grade residual income valuation.
            </p>
          </Panel>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid gap-4 md:grid-cols-3">
              {SCENARIO_META.map((meta) => (
                <ScenarioCard key={meta.key} scenario={result!.scenarios[meta.key]} accent={meta.accent} />
              ))}
            </div>

            <Panel className="p-5">
              <motion.div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Profitability context</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Historical metrics</h3>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-[#8EA0BA]">
                    Avg ROE{' '}
                    <span className="font-semibold text-white">{formatPercent(result!.historicalStats.averageRoe)}</span>
                  </span>
                  <span className="text-[#8EA0BA]">
                    BV CAGR{' '}
                    <span className="font-semibold text-white">
                      {formatPercent(result!.historicalStats.bookValueCagr)}
                    </span>
                  </span>
                  <span className="text-[#8EA0BA]">
                    NI CAGR{' '}
                    <span className="font-semibold text-white">
                      {formatPercent(result!.historicalStats.netIncomeCagr)}
                    </span>
                  </span>
                </div>
              </motion.div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <MetricTile
                  label="Economic profit (base)"
                  value={formatCurrency(result!.scenarios.base.cumulativeEconomicProfit, true)}
                  sub="Cumulative residual income"
                />
                <MetricTile
                  label="PV residual income"
                  value={formatCurrency(result!.scenarios.base.pvResidualIncome, true)}
                />
                <MetricTile
                  label="ROE spread (base)"
                  value={formatPercent(result!.scenarios.base.averageRoeSpread)}
                />
                <MetricTile
                  label="Retained earnings"
                  value={formatCurrency(result!.company.retainedEarnings, true)}
                />
              </div>
            </Panel>

            <motion.div
              className="grid gap-5 lg:grid-cols-2"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
            >
              <ChartFrame title="ROE vs cost of equity" subtitle="Historical ROE · base-case Ke overlay">
                <ClientChart className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result!.charts.roeVsCostOfEquity}>
                      <defs>
                        <linearGradient id="roeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4F8CFF" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#4F8CFF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="year" stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <YAxis stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <Tooltip content={<RIMChartTooltip valueFormatter={(v) => formatPercent(v)} />} />
                      <Legend />
                      <Area type="monotone" dataKey="roe" name="ROE" stroke="#4F8CFF" fill="url(#roeGradient)" />
                      <Line
                        type="monotone"
                        dataKey="costOfEquity"
                        name="Cost of equity"
                        stroke="#FF6B6B"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>

              <ChartFrame title="Residual income projection" subtitle="Bear · base · bull economic profit path">
                <ClientChart className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result!.charts.residualIncomeProjection}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="year" stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <YAxis stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <Tooltip content={<RIMChartTooltip valueFormatter={(v) => formatCurrency(v, true)} />} />
                      <Legend />
                      <Line type="monotone" dataKey="bear" name="Bear" stroke="#FF6B6B" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="base" name="Base" stroke="#4F8CFF" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="bull" name="Bull" stroke="#00C896" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>

              <ChartFrame title="Book value per share" subtitle="Projected BVPS trajectory by scenario">
                <ClientChart className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result!.charts.bookValueGrowth}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="year" stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <YAxis stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <Tooltip content={<RIMChartTooltip valueFormatter={(v) => formatCurrency(v, false)} />} />
                      <Legend />
                      <Area type="monotone" dataKey="base" name="Base" stroke="#4F8CFF" fill="#4F8CFF22" />
                      <Area type="monotone" dataKey="bull" name="Bull" stroke="#00C896" fill="#00C89618" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>

              <ChartFrame title="Economic profit trend" subtitle="Residual income by forecast year">
                <ClientChart className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result!.charts.economicProfitTrend}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="year" stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <YAxis stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                      <Tooltip content={<RIMChartTooltip valueFormatter={(v) => formatCurrency(v, true)} />} />
                      <Legend />
                      <Bar dataKey="base" name="Base" fill="#4F8CFF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>
            </motion.div>

            <ChartFrame title="Scenario fair value" subtitle="Intrinsic per share vs current market price">
              <ClientChart className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result!.charts.scenarioComparison}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                    <YAxis stroke="#6F7F91" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                    <Tooltip content={<RIMChartTooltip valueFormatter={(v) => formatCurrency(v, false)} />} />
                    <Legend />
                    <Bar dataKey="intrinsicValue" name="Intrinsic" fill="#4F8CFF" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="currentPrice" name="Market" fill="#6F7F91" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ClientChart>
            </ChartFrame>

            {result!.insights.length > 0 ? (
              <Panel className="p-5">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={18} className="text-[#4F8CFF]" />
                  <h3 className="text-sm font-semibold text-white">Institutional insights</h3>
                </div>
                <ul className="mt-4 space-y-3">
                  {result!.insights.map((insight) => (
                    <motion.li
                      key={insight}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3 text-sm leading-6 text-[#94A4BE]"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4F8CFF]" />
                      {insight}
                    </motion.li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
