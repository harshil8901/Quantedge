'use client';

import { useCallback, useEffect, useState } from 'react';
import ModelingToolbar from '@/components/modeling/ModelingToolbar';
import { useModelingWorkspace } from '@/hooks/useModelingWorkspace';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BrainCircuit,
  Landmark,
  Layers,
  RefreshCcw,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
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
import { formatCurrency, formatMultiple, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const ACCENT = '#7C5CFF';

type LBOScenarioKey = 'downside' | 'base' | 'upside';

type LBOCompanyData = {
  ticker: string;
  companyName: string;
  stockPrice: number;
  marketCap: number;
  enterpriseValue: number;
  revenue: number;
  ebitda: number;
  netIncome: number;
  cash: number;
  debt: number;
  sharesOutstanding: number;
  ebitdaMargin: number;
  revenueGrowth: number;
};

type LBOAssumptions = {
  entryMultiple: number;
  exitMultiple: number;
  debtPercent: number;
  equityPercent: number;
  interestRate: number;
  ebitdaGrowth: number;
  holdingPeriod: number;
  debtRepaymentPercent: number;
  seniorDebtShare: number;
  subordinatedDebtShare: number;
};

type LBOScenarioOutput = {
  label: string;
  scenarioKey: LBOScenarioKey;
  exitEnterpriseValue: number;
  exitSponsorEquity: number;
  initialSponsorEquity: number;
  totalDebtPaydown: number;
  remainingDebt: number;
  moic: number;
  irr: number;
  leverageAtEntry: number;
  leverageAtExit: number;
  summary: string;
  narrative: string;
};

type LBOValuationResult = {
  company: LBOCompanyData;
  assumptions: LBOAssumptions;
  acquisition: {
    entryEnterpriseValue: number;
    totalDebt: number;
    seniorDebt: number;
    subordinatedDebt: number;
    sponsorEquity: number;
    leverageRatio: number;
  };
  scenarios: {
    downside: LBOScenarioOutput;
    base: LBOScenarioOutput;
    upside: LBOScenarioOutput;
  };
  insights: string[];
  charts: {
    debtPaydownSchedule: Array<{ year: string; downside: number; base: number; upside: number }>;
    irrSensitivity: Array<{ exitMultiple: string; downside: number; base: number; upside: number }>;
    exitMultipleSensitivity: Array<{ label: string; irr: number; moic: number }>;
    sponsorEquityGrowth: Array<{ year: string; downside: number; base: number; upside: number }>;
    capitalStructure: Array<{ segment: string; value: number; fill: string }>;
  };
};

type WorkspaceResponse = {
  company: LBOCompanyData;
  suggestedAssumptions: LBOAssumptions;
};

const SCENARIO_META: Array<{
  key: LBOScenarioKey;
  label: string;
  accent: string;
  icon: typeof TrendingDown;
}> = [
  { key: 'downside', label: 'Downside Exit', accent: '#FF7A90', icon: TrendingDown },
  { key: 'base', label: 'Base Exit', accent: ACCENT, icon: Landmark },
  { key: 'upside', label: 'Upside Exit', accent: '#00C896', icon: TrendingUp },
];

function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-white/[0.08] bg-[#070B14] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8EA0BA]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#6F7F91]">{sub}</p> : null}
    </motion.div>
  );
}

function ScenarioCard({
  scenario,
  accent,
  icon: Icon,
}: {
  scenario: LBOScenarioOutput;
  accent: string;
  icon: typeof TrendingDown;
}) {
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
          <p className="mt-3 text-3xl font-semibold text-white">{formatPercent(scenario.irr)}</p>
          <p className="mt-1 text-xs text-[#6F7F91]">Sponsor IRR</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#070B14] p-2.5" style={{ color: accent }}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#6F7F91]">MOIC</p>
          <p className="mt-1 font-semibold text-[#E8F0FF]">{scenario.moic.toFixed(2)}x</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#6F7F91]">Exit equity</p>
          <p className="mt-1 font-semibold text-[#E8F0FF]">{formatCurrency(scenario.exitSponsorEquity)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#6F7F91]">Debt paydown</p>
          <p className="mt-1 font-semibold text-[#00C896]">{formatCurrency(scenario.totalDebtPaydown)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#6F7F91]">Exit leverage</p>
          <p className="mt-1 font-semibold text-[#E8F0FF]">{formatMultiple(scenario.leverageAtExit)}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[#8EA0BA]">{scenario.summary}</p>
    </motion.div>
  );
}

type ChartTooltipPayload = { value?: number | string; name?: string; dataKey?: string | number };

function LBOChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string | number;
  valueFormatter?: (value: number) => string;
}) {
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

async function fetchWorkspace(ticker: string): Promise<WorkspaceResponse> {
  const response = await fetch(`${API_URL}/api/company/lbo/${encodeURIComponent(ticker)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch LBO workspace.');
  }
  return response.json();
}

async function runLBOValuation(payload: {
  company: LBOCompanyData;
  assumptions: LBOAssumptions;
}): Promise<LBOValuationResult> {
  const response = await fetch(`${API_URL}/api/valuation/lbo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to calculate LBO valuation.');
  }
  return response.json();
}

const DEFAULT_LBO_COMPANY: LBOCompanyData = {
  ticker: 'PRIVATE',
  companyName: 'Custom Company',
  stockPrice: 50,
  marketCap: 5_000_000_000,
  enterpriseValue: 6_000_000_000,
  revenue: 2_000_000_000,
  ebitda: 400_000_000,
  netIncome: 200_000_000,
  cash: 500_000_000,
  debt: 1_500_000_000,
  sharesOutstanding: 100_000_000,
  ebitdaMargin: 20,
  revenueGrowth: 5,
};

const DEFAULT_LBO_ASSUMPTIONS: LBOAssumptions = {
  entryMultiple: 10,
  exitMultiple: 11,
  debtPercent: 60,
  equityPercent: 40,
  interestRate: 7,
  ebitdaGrowth: 5,
  holdingPeriod: 5,
  debtRepaymentPercent: 50,
  seniorDebtShare: 70,
  subordinatedDebtShare: 30,
};

export default function LBOValuation() {
  const workspace = useModelingWorkspace('lbo');
  const [company, setCompany] = useState<LBOCompanyData | null>(null);
  const [assumptions, setAssumptions] = useState<LBOAssumptions | null>(null);
  const [activeScenario, setActiveScenario] = useState<LBOScenarioKey>('base');

  useEffect(() => {
    if (workspace.preferences.inputMode !== 'manual' || company) return;
    setCompany({
      ...DEFAULT_LBO_COMPANY,
      companyName: workspace.company.companyName || DEFAULT_LBO_COMPANY.companyName,
      ticker: workspace.company.ticker || DEFAULT_LBO_COMPANY.ticker,
    });
    setAssumptions(DEFAULT_LBO_ASSUMPTIONS);
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

  const valuationMutation = useMutation({ mutationFn: runLBOValuation });

  const round1 = (n: number) => Number(n.toFixed(1));

  const updateAssumption = <K extends keyof LBOAssumptions>(key: K, value: LBOAssumptions[K]) => {
    setAssumptions((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      if (key === 'debtPercent') next.equityPercent = round1(100 - (value as number));
      if (key === 'equityPercent') next.debtPercent = round1(100 - (value as number));
      return next;
    });
  };

  const rerun = useCallback(() => {
    if (!company || !assumptions) return;
    valuationMutation.mutate({ company, assumptions });
  }, [company, assumptions, valuationMutation]);

  const result = valuationMutation.data;
  const activeCase = result?.scenarios[activeScenario];

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      {/* LEFT */}
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
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <Panel className="space-y-4 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Acquisition assumptions</p>
              <NumberField label="Entry multiple" value={assumptions.entryMultiple} onChange={(v) => updateAssumption('entryMultiple', v)} step={0.5} suffix="x" />
              <NumberField label="Exit multiple (base)" value={assumptions.exitMultiple} onChange={(v) => updateAssumption('exitMultiple', v)} step={0.5} suffix="x" />
              <RangeField label="Holding period" value={assumptions.holdingPeriod} onChange={(v) => updateAssumption('holdingPeriod', v)} min={3} max={10} step={1} suffix=" yrs" />
              <RangeField label="EBITDA growth (base)" value={assumptions.ebitdaGrowth} onChange={(v) => updateAssumption('ebitdaGrowth', v)} min={0} max={20} step={0.5} />
            </Panel>

            <Panel className="space-y-4 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Debt structure</p>
              <RangeField label="Debt %" value={assumptions.debtPercent} onChange={(v) => updateAssumption('debtPercent', v)} min={40} max={80} step={1} />
              <RangeField label="Equity %" value={assumptions.equityPercent} onChange={(v) => updateAssumption('equityPercent', v)} min={20} max={60} step={1} />
              <RangeField label="Interest rate" value={assumptions.interestRate} onChange={(v) => updateAssumption('interestRate', v)} min={4} max={12} step={0.25} />
              <RangeField label="Debt repayment %" value={assumptions.debtRepaymentPercent} onChange={(v) => updateAssumption('debtRepaymentPercent', v)} min={20} max={70} step={1} />
              <RangeField label="Senior debt share" value={assumptions.seniorDebtShare} onChange={(v) => updateAssumption('seniorDebtShare', v)} min={50} max={90} step={1} />
            </Panel>

            <Panel className="p-5">
              <Button className="w-full" onClick={rerun} disabled={valuationMutation.isPending || !company}>
                {valuationMutation.isPending ? 'Underwriting…' : 'Run sponsor model'}
              </Button>
            </Panel>
          </motion.div>
        ) : null}
      </div>

      {/* RIGHT */}
      <div className="space-y-5">
        <AnimatePresence mode="wait">
          {company && result ? (
            <motion.div key="loaded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Panel className="p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Acquisition overview</p>
                    <h3 className="mt-1 text-2xl font-semibold text-white">
                      {company.companyName} <span style={{ color: ACCENT }}>({company.ticker})</span>
                    </h3>
                  </div>
                  <Button variant="secondary" onClick={() => workspaceMutation.mutate(company.ticker)} disabled={workspaceMutation.isPending}>
                    <RefreshCcw size={14} className={workspaceMutation.isPending ? 'animate-spin' : ''} />
                    Refresh
                  </Button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricTile label="Entry EV" value={formatCurrency(result.acquisition.entryEnterpriseValue)} sub={`${formatMultiple(assumptions?.entryMultiple ?? 0)} EBITDA`} />
                  <MetricTile label="Debt funding" value={formatCurrency(result.acquisition.totalDebt)} sub={`${formatMultiple(result.acquisition.leverageRatio)} leverage`} />
                  <MetricTile label="Sponsor equity" value={formatCurrency(result.acquisition.sponsorEquity)} />
                  <MetricTile label="EBITDA" value={formatCurrency(company.ebitda)} sub={`Margin ${formatPercent(company.ebitdaMargin)}`} />
                </div>
              </Panel>

              <div className="grid gap-5 lg:grid-cols-2">
                <Panel className="p-5">
                  <div className="flex items-center gap-2">
                    <Layers size={16} style={{ color: ACCENT }} />
                    <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Capital structure</p>
                  </div>
                  <ClientChart className="mt-4 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={result.charts.capitalStructure}
                          dataKey="value"
                          nameKey="segment"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={3}
                        >
                          {result.charts.capitalStructure.map((entry) => (
                            <Cell key={entry.segment} fill={entry.fill} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip content={<LBOChartTooltip valueFormatter={(v) => formatCurrency(v)} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ClientChart>
                  <div className="mt-4 space-y-2">
                    {result.charts.capitalStructure.map((row) => (
                      <div key={row.segment} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-[#8EA0BA]">
                          <span className="h-2 w-2 rounded-full" style={{ background: row.fill }} />
                          {row.segment}
                        </span>
                        <span className="font-medium text-white">{formatCurrency(row.value)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="flex h-full">
                      <div
                        className="h-full"
                        style={{
                          width: `${((assumptions?.debtPercent ?? 60) * (assumptions?.seniorDebtShare ?? 70)) / 100}%`,
                          background: '#7C5CFF',
                        }}
                      />
                      <div
                        className="h-full"
                        style={{
                          width: `${((assumptions?.debtPercent ?? 60) * (assumptions?.subordinatedDebtShare ?? 30)) / 100}%`,
                          background: '#5B8DEF',
                        }}
                      />
                      <div className="h-full flex-1" style={{ background: '#00C896' }} />
                    </div>
                  </div>
                </Panel>

                <Panel className="p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Scenario lens</p>
                  <div className="mt-3 space-y-2">
                    {SCENARIO_META.map(({ key, label, accent }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveScenario(key)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition',
                          activeScenario === key
                            ? 'border-white/15 bg-[#070B14] text-white'
                            : 'border-transparent text-[#8EA0BA] hover:bg-white/[0.03]',
                        )}
                      >
                        <span>{label}</span>
                        <span className="font-semibold tabular-nums" style={{ color: accent }}>
                          {result.scenarios[key].irr.toFixed(1)}% IRR
                        </span>
                      </button>
                    ))}
                  </div>
                  {activeCase ? (
                    <p className="mt-4 text-sm leading-relaxed text-[#8EA0BA]">{activeCase.narrative}</p>
                  ) : null}
                </Panel>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {SCENARIO_META.map(({ key, accent, icon }) => (
                  <ScenarioCard key={key} scenario={result.scenarios[key]} accent={accent} icon={icon} />
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <ChartFrame title="Debt paydown schedule" subtitle="Ending debt by year · scenario paths">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.charts.debtPaydownSchedule}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1e9).toFixed(1)}B`} />
                        <Tooltip content={<LBOChartTooltip valueFormatter={(v) => formatCurrency(v)} />} />
                        <Line type="monotone" dataKey="downside" stroke="#FF7A90" strokeWidth={2} dot={false} name="Downside" />
                        <Line type="monotone" dataKey="base" stroke={ACCENT} strokeWidth={2} dot={false} name="Base" />
                        <Line type="monotone" dataKey="upside" stroke="#00C896" strokeWidth={2} dot={false} name="Upside" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="IRR sensitivity matrix" subtitle="IRR by exit multiple · scenario">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.charts.irrSensitivity}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="exitMultiple" tick={{ fill: '#8EA0BA', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 11 }} unit="%" />
                        <Tooltip content={<LBOChartTooltip valueFormatter={(v) => formatPercent(v)} />} />
                        <Line type="monotone" dataKey="downside" stroke="#FF7A90" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="base" stroke={ACCENT} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="upside" stroke="#00C896" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="Exit multiple sensitivity" subtitle="IRR & MOIC by exit case">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.charts.exitMultipleSensitivity}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: '#8EA0BA', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 11 }} unit="%" />
                        <Tooltip content={<LBOChartTooltip valueFormatter={(v) => formatPercent(v)} />} />
                        <Bar dataKey="irr" radius={[6, 6, 0, 0]}>
                          {result.charts.exitMultipleSensitivity.map((_, i) => (
                            <Cell key={i} fill={[ '#FF7A90', ACCENT, '#00C896' ][i]} fillOpacity={0.9} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="Sponsor equity growth" subtitle="Interpolated equity value path">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.charts.sponsorEquityGrowth}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1e9).toFixed(1)}B`} />
                        <Tooltip content={<LBOChartTooltip valueFormatter={(v) => formatCurrency(v)} />} />
                        <Line type="monotone" dataKey="downside" stroke="#FF7A90" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="base" stroke={ACCENT} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="upside" stroke="#00C896" strokeWidth={2} dot={false} />
                      </LineChart>
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
                      <Shield size={14} className="mt-1 shrink-0" style={{ color: ACCENT }} />
                      {insight}
                    </motion.li>
                  ))}
                </ul>
              </Panel>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Panel className="flex min-h-[520px] flex-col items-center justify-center p-10 text-center">
                <Wallet className="opacity-50" size={40} style={{ color: ACCENT }} />
                <h3 className="mt-6 text-xl font-semibold text-white">Sponsor underwriting workspace</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[#8EA0BA]">
                  Enter a target ticker to build acquisition structure, model debt schedules, and quantify sponsor IRR,
                  MOIC, and exit equity across downside, base, and upside paths.
                </p>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
