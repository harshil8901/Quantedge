'use client';

import { useCallback, useEffect, useState } from 'react';
import ModelingToolbar from '@/components/modeling/ModelingToolbar';
import { useModelingWorkspace } from '@/hooks/useModelingWorkspace';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BrainCircuit,
  Gauge,
  RefreshCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { chartTooltipCurrency, chartTooltipPercent, formatCurrency, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const ACCENT = '#00E5A8';

type EVAScenarioKey = 'efficiency' | 'base' | 'reinvestment';

type EVACompanyData = {
  ticker: string;
  companyName: string;
  stockPrice: number;
  marketCap: number;
  enterpriseValue: number;
  revenue: number;
  ebitda: number;
  ebit: number;
  netIncome: number;
  debt: number;
  equity: number;
  cash: number;
  investedCapital: number;
  roic: number;
  revenueGrowth: number;
  ebitdaMargin: number;
};

type EVAAssumptions = {
  taxRate: number;
  wacc: number;
  forecastYears: number;
  nopatGrowth: number;
  reinvestmentRate: number;
  capitalGrowth: number;
};

type EVAScenarioOutput = {
  label: string;
  scenarioKey: EVAScenarioKey;
  currentNopat: number;
  currentInvestedCapital: number;
  currentEva: number;
  currentRoic: number;
  currentRoicSpread: number;
  cumulativeEva: number;
  averageRoicSpread: number;
  valueCreation: boolean;
  summary: string;
  narrative: string;
};

type EVAValuationResult = {
  company: EVACompanyData;
  assumptions: EVAAssumptions;
  scenarios: {
    efficiency: EVAScenarioOutput;
    base: EVAScenarioOutput;
    reinvestment: EVAScenarioOutput;
  };
  insights: string[];
  charts: {
    roicVsWacc: Array<{ year: string; roic: number; wacc: number; spread: number }>;
    evaTrend: Array<{ year: string; efficiency: number; base: number; reinvestment: number }>;
    investedCapitalGrowth: Array<{ year: string; efficiency: number; base: number; reinvestment: number }>;
    economicProfitWaterfall: Array<{ step: string; value: number; fill: string }>;
    scenarioComparison: Array<{ label: string; eva: number; roicSpread: number; cumulativeEva: number }>;
  };
};

const SCENARIO_META: Array<{ key: EVAScenarioKey; label: string; accent: string; icon: typeof TrendingDown }> = [
  { key: 'efficiency', label: 'Efficiency Reset', accent: '#FF7A90', icon: TrendingDown },
  { key: 'base', label: 'Base NOPAT', accent: ACCENT, icon: Gauge },
  { key: 'reinvestment', label: 'Reinvestment Case', accent: '#4F8CFF', icon: Zap },
];

function MetricTile({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-white/[0.08] bg-[#070B14] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8EA0BA]">{label}</p>
      <p className={cn('mt-2 text-lg font-semibold', highlight ? 'text-[#00E5A8]' : 'text-white')}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#6F7F91]">{sub}</p> : null}
    </motion.div>
  );
}

function ScenarioCard({ scenario, accent, icon: Icon }: { scenario: EVAScenarioOutput; accent: string; icon: typeof TrendingDown }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101725] p-5"
      style={{ boxShadow: `0 24px 80px ${accent}18` }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-25 blur-3xl" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8EA0BA]">{scenario.label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(scenario.currentEva)}</p>
          <p className="mt-1 text-xs text-[#6F7F91]">Current EVA</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#070B14] p-2.5" style={{ color: accent }}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] uppercase text-[#6F7F91]">ROIC spread</p>
          <p className={cn('mt-1 font-semibold', scenario.currentRoicSpread >= 0 ? 'text-[#00E5A8]' : 'text-[#FF7A90]')}>
            {scenario.currentRoicSpread >= 0 ? '+' : ''}
            {formatPercent(scenario.currentRoicSpread)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#6F7F91]">Cumulative EVA</p>
          <p className="mt-1 font-semibold text-[#E8F0FF]">{formatCurrency(scenario.cumulativeEva)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#6F7F91]">ROIC</p>
          <p className="mt-1 font-semibold text-[#E8F0FF]">{formatPercent(scenario.currentRoic)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#6F7F91]">Value creation</p>
          <p className="mt-1 font-semibold text-[#E8F0FF]">{scenario.valueCreation ? 'Yes' : 'No'}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[#8EA0BA]">{scenario.summary}</p>
    </motion.div>
  );
}

async function fetchWorkspace(ticker: string) {
  const response = await fetch(`${API_URL}/api/company/eva/${encodeURIComponent(ticker)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch EVA workspace.');
  }
  return response.json() as Promise<{
    company: EVACompanyData;
    suggestedAssumptions: EVAAssumptions;
  }>;
}

async function runEVAValuation(payload: { company: EVACompanyData; assumptions: EVAAssumptions }) {
  const response = await fetch(`${API_URL}/api/valuation/eva`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to calculate EVA valuation.');
  }
  return response.json() as Promise<EVAValuationResult>;
}

const DEFAULT_EVA_COMPANY: EVACompanyData = {
  ticker: 'PRIVATE',
  companyName: 'Custom Company',
  stockPrice: 100,
  marketCap: 8_000_000_000,
  enterpriseValue: 10_000_000_000,
  revenue: 5_000_000_000,
  ebitda: 1_200_000_000,
  ebit: 900_000_000,
  netIncome: 600_000_000,
  debt: 3_000_000_000,
  equity: 5_000_000_000,
  cash: 800_000_000,
  investedCapital: 7_500_000_000,
  roic: 12,
  revenueGrowth: 4,
  ebitdaMargin: 24,
};

const DEFAULT_EVA_ASSUMPTIONS: EVAAssumptions = {
  taxRate: 25,
  wacc: 9,
  forecastYears: 5,
  nopatGrowth: 5,
  reinvestmentRate: 45,
  capitalGrowth: 4,
};

export default function EVAValuation() {
  const workspace = useModelingWorkspace('eva');
  const [company, setCompany] = useState<EVACompanyData | null>(null);
  const [assumptions, setAssumptions] = useState<EVAAssumptions | null>(null);
  const [activeScenario, setActiveScenario] = useState<EVAScenarioKey>('base');

  useEffect(() => {
    if (workspace.preferences.inputMode !== 'manual' || company) return;
    setCompany({
      ...DEFAULT_EVA_COMPANY,
      companyName: workspace.company.companyName || DEFAULT_EVA_COMPANY.companyName,
      ticker: workspace.company.ticker || DEFAULT_EVA_COMPANY.ticker,
    });
    setAssumptions(DEFAULT_EVA_ASSUMPTIONS);
  }, [workspace.preferences.inputMode, workspace.company.companyName, workspace.company.ticker, company]);

  const workspaceMutation = useMutation({
    mutationFn: fetchWorkspace,
    onSuccess: (data) => {
      workspace.applyApiCompany(data.company as unknown as Record<string, unknown>);
      workspace.setTickerQuery(data.company.ticker);
      setCompany(data.company);
      setAssumptions(data.suggestedAssumptions);
      valuationMutation.mutate({ company: data.company, assumptions: data.suggestedAssumptions });
    },
  });

  const valuationMutation = useMutation({ mutationFn: runEVAValuation });

  const rerun = useCallback(() => {
    if (!company || !assumptions) return;
    valuationMutation.mutate({ company, assumptions });
  }, [company, assumptions, valuationMutation]);

  const result = valuationMutation.data;
  const activeCase = result?.scenarios[activeScenario];
  const wacc = assumptions?.wacc ?? 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <div className="space-y-5">
        <ModelingToolbar
          workspace={workspace}
          accent={ACCENT}
          title="Target company"
          onFetch={() => workspaceMutation.mutate(workspace.tickerQuery)}
          fetchPending={workspaceMutation.isPending}
          fetchError={
            workspaceMutation.error instanceof Error ? workspaceMutation.error.message : workspaceMutation.isError ? 'Load failed.' : null
          }
        />

        {assumptions ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <Panel className="space-y-4 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Profitability inputs</p>
              <RangeField label="Tax rate" value={assumptions.taxRate} onChange={(v) => setAssumptions({ ...assumptions, taxRate: v })} min={15} max={40} step={0.5} />
              <RangeField label="WACC" value={assumptions.wacc} onChange={(v) => setAssumptions({ ...assumptions, wacc: v })} min={5} max={15} step={0.25} />
              <RangeField label="NOPAT growth (base)" value={assumptions.nopatGrowth} onChange={(v) => setAssumptions({ ...assumptions, nopatGrowth: v })} min={0} max={20} step={0.5} />
            </Panel>

            <Panel className="space-y-4 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Capital assumptions</p>
              <RangeField label="Reinvestment rate" value={assumptions.reinvestmentRate} onChange={(v) => setAssumptions({ ...assumptions, reinvestmentRate: v })} min={20} max={80} step={1} />
              <RangeField label="Capital growth" value={assumptions.capitalGrowth} onChange={(v) => setAssumptions({ ...assumptions, capitalGrowth: v })} min={0} max={15} step={0.5} />
              <NumberField label="Forecast years" value={assumptions.forecastYears} onChange={(v) => setAssumptions({ ...assumptions, forecastYears: v })} step={1} min={3} max={10} />
            </Panel>

            <Panel className="p-5">
              <Button className="w-full" onClick={rerun} disabled={valuationMutation.isPending || !company}>
                {valuationMutation.isPending ? 'Analyzing…' : 'Run EVA model'}
              </Button>
            </Panel>
          </motion.div>
        ) : null}
      </div>

      <div className="space-y-5">
        <AnimatePresence mode="wait">
          {company && result ? (
            <motion.div key="loaded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Panel className="p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Capital efficiency overview</p>
                    <h3 className="mt-1 text-2xl font-semibold text-white">
                      {company.companyName} <span style={{ color: ACCENT }}>({company.ticker})</span>
                    </h3>
                  </div>
                  <Button variant="secondary" onClick={() => workspaceMutation.mutate(company.ticker)} disabled={workspaceMutation.isPending}>
                    <RefreshCcw size={14} className={workspaceMutation.isPending ? 'animate-spin' : ''} />
                    Refresh
                  </Button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <MetricTile label="ROIC" value={formatPercent(company.roic)} highlight={company.roic > wacc} />
                  <MetricTile label="WACC" value={formatPercent(wacc)} />
                  <MetricTile
                    label="ROIC spread"
                    value={`${(company.roic - wacc) >= 0 ? '+' : ''}${formatPercent(company.roic - wacc)}`}
                    highlight={company.roic > wacc}
                  />
                  <MetricTile label="Invested capital" value={formatCurrency(company.investedCapital)} />
                  <MetricTile label="EVA (base)" value={formatCurrency(result.scenarios.base.currentEva)} highlight />
                </div>
              </Panel>

              <Panel className="p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Value creation analysis</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricTile label="NOPAT" value={formatCurrency(result.scenarios.base.currentNopat)} sub="EBIT × (1 − tax)" />
                  <MetricTile label="Capital charge" value={formatCurrency(result.scenarios.base.currentInvestedCapital * (wacc / 100))} sub="IC × WACC" />
                  <MetricTile label="Avg ROIC spread" value={formatPercent(result.scenarios.base.averageRoicSpread)} />
                  <MetricTile label="5Y cumulative EVA" value={formatCurrency(result.scenarios.base.cumulativeEva)} />
                </div>
              </Panel>

              <div className="grid gap-4 lg:grid-cols-3">
                {SCENARIO_META.map(({ key, accent, icon }) => (
                  <ScenarioCard key={key} scenario={result.scenarios[key]} accent={accent} icon={icon} />
                ))}
              </div>

              <Panel className="p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Scenario lens</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SCENARIO_META.map(({ key, label, accent }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveScenario(key)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm transition',
                        activeScenario === key ? 'border-white/20 bg-[#070B14] text-white' : 'border-transparent text-[#8EA0BA] hover:bg-white/[0.04]',
                      )}
                    >
                      <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
                      {label}
                    </button>
                  ))}
                </div>
                {activeCase ? <p className="mt-4 text-sm leading-relaxed text-[#8EA0BA]">{activeCase.narrative}</p> : null}
              </Panel>

              <div className="grid gap-4 lg:grid-cols-2">
                <ChartFrame title="ROIC vs WACC" subtitle="Base case spread by forecast year">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.charts.roicVsWacc}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 11 }} unit="%" />
                        <Tooltip formatter={chartTooltipPercent} />
                        <Line type="monotone" dataKey="roic" stroke={ACCENT} strokeWidth={2} name="ROIC" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="wacc" stroke="#6F7F91" strokeWidth={2} strokeDasharray="4 4" name="WACC" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="EVA trend" subtitle="Economic profit by scenario">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.charts.evaTrend}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1e9).toFixed(1)}B`} />
                        <Tooltip formatter={chartTooltipCurrency()} />
                        <Line type="monotone" dataKey="efficiency" stroke="#FF7A90" strokeWidth={2} name="Efficiency" dot={false} />
                        <Line type="monotone" dataKey="base" stroke={ACCENT} strokeWidth={2} name="Base" dot={false} />
                        <Line type="monotone" dataKey="reinvestment" stroke="#4F8CFF" strokeWidth={2} name="Reinvestment" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="Invested capital growth" subtitle="Capital base trajectory">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.charts.investedCapitalGrowth}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1e9).toFixed(0)}B`} />
                        <Tooltip formatter={chartTooltipCurrency()} />
                        <Line type="monotone" dataKey="base" stroke={ACCENT} strokeWidth={2} name="Base" dot={false} />
                        <Line type="monotone" dataKey="reinvestment" stroke="#4F8CFF" strokeWidth={2} name="Reinvestment" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="Economic profit waterfall" subtitle="NOPAT → capital charge → EVA">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.charts.economicProfitWaterfall}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="step" tick={{ fill: '#8EA0BA', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1e9).toFixed(1)}B`} />
                        <Tooltip formatter={chartTooltipCurrency()} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {result.charts.economicProfitWaterfall.map((entry) => (
                            <Cell key={entry.step} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="Scenario comparison" subtitle="Current EVA & cumulative economic profit">
                  <ClientChart className="h-52 lg:col-span-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.charts.scenarioComparison}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: '#8EA0BA', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1e9).toFixed(1)}B`} />
                        <Tooltip formatter={chartTooltipCurrency()} />
                        <Bar dataKey="eva" fill={ACCENT} name="Current EVA" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cumulativeEva" fill="#4F8CFF" name="Cumulative EVA" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>
              </div>

              <Panel className="p-5">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={18} style={{ color: ACCENT }} />
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Institutional insights</p>
                </div>
                <ul className="mt-4 space-y-3">
                  {result.insights.map((insight, i) => (
                    <motion.li
                      key={insight}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex gap-3 text-sm leading-relaxed text-[#C5D3EA]"
                    >
                      <Activity size={14} className="mt-1 shrink-0" style={{ color: ACCENT }} />
                      {insight}
                    </motion.li>
                  ))}
                </ul>
              </Panel>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Panel className="flex min-h-[520px] flex-col items-center justify-center p-10 text-center">
                <Gauge className="opacity-50" size={40} style={{ color: ACCENT }} />
                <h3 className="mt-6 text-xl font-semibold text-white">Economic value added workspace</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[#8EA0BA]">
                  Enter a ticker to analyze NOPAT, invested capital, ROIC versus WACC, and economic profit across
                  efficiency, base, and reinvestment scenarios.
                </p>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
