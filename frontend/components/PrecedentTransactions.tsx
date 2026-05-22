'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ModelingToolbar from '@/components/modeling/ModelingToolbar';
import { useModelingWorkspace } from '@/hooks/useModelingWorkspace';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  BrainCircuit,
  Building2,
  Landmark,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
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
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import { formatCurrency, formatMultiple, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type PrecedentDealType = 'Strategic' | 'Financial Sponsor' | 'Take-Private' | 'Merger of Equals';
type PrecedentScenarioKey = 'strategic' | 'sponsor' | 'scarcity';

type PrecedentTargetCompany = {
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
  sector: string;
  industry: string;
};

type PrecedentTransaction = {
  id: string;
  acquirer: string;
  target: string;
  dealDate: string;
  dealYear: number;
  dealValue: number;
  evEbitda: number;
  evRevenue: number;
  premiumPaid: number;
  sector: string;
  dealType: PrecedentDealType;
};

type PrecedentScenarioCase = {
  label: string;
  scenarioKey: PrecedentScenarioKey;
  evEbitdaMultiple: number;
  evRevenueMultiple: number;
  premiumPaidPercent: number;
  impliedEnterpriseValue: number;
  impliedEquityValue: number;
  impliedOfferPricePerShare: number;
  controlPremiumPercent: number;
  synergyValue?: number;
  summary: string;
  narrative: string;
};

type PrecedentValuationResult = {
  target: PrecedentTargetCompany;
  transactions: PrecedentTransaction[];
  scenarios: {
    strategic: PrecedentScenarioCase;
    sponsor: PrecedentScenarioCase;
    scarcity: PrecedentScenarioCase;
  };
  valuationRange: { low: number; mid: number; high: number; currentPrice: number };
  insights: string[];
  charts: {
    multipleDistribution: Array<{ bucket: string; count: number; avgMultiple: number }>;
    premiumPaidAnalysis: Array<{ deal: string; premium: number; dealType: string }>;
    valuationRange: Array<{ label: string; price: number; scenario?: string }>;
    dealTimeline: Array<{ year: string; dealCount: number; avgPremium: number; totalDealValue: number }>;
  };
};

type WorkspaceResponse = {
  target: PrecedentTargetCompany;
  transactions: PrecedentTransaction[];
  availableSectors: string[];
  availableDealTypes: PrecedentDealType[];
};

const SCENARIO_META: Array<{
  key: PrecedentScenarioKey;
  label: string;
  accent: string;
  icon: typeof Building2;
}> = [
  { key: 'strategic', label: 'Strategic Buyer', accent: '#4F8CFF', icon: Building2 },
  { key: 'sponsor', label: 'Financial Sponsor', accent: '#00C896', icon: Landmark },
  { key: 'scarcity', label: 'Scarcity Premium', accent: '#FF7A90', icon: Sparkles },
];

const DEAL_TYPE_OPTIONS: PrecedentDealType[] = [
  'Strategic',
  'Financial Sponsor',
  'Take-Private',
  'Merger of Equals',
];

type ChartTooltipPayload = { value?: number | string; name?: string; dataKey?: string | number };

function PrecedentChartTooltip({
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

function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-white/[0.08] bg-[#070B14] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8EA0BA]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#6F7F91]">{sub}</p> : null}
    </motion.div>
  );
}

function ScenarioValuationCard({
  scenario,
  accent,
  icon: Icon,
}: {
  scenario: PrecedentScenarioCase;
  accent: string;
  icon: typeof Building2;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101725] p-5"
      style={{ boxShadow: `0 24px 80px ${accent}12` }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-3xl" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8EA0BA]">{scenario.label}</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {formatCurrency(scenario.impliedOfferPricePerShare, false)}
          </p>
          <p className="mt-1 text-xs text-[#6F7F91]">Implied offer price / share</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#070B14] p-2.5" style={{ color: accent }}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#6F7F91]">EV / EBITDA</p>
          <p className="mt-1 font-semibold text-[#E8F0FF]">{formatMultiple(scenario.evEbitdaMultiple)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#6F7F91]">Premium paid</p>
          <p className="mt-1 font-semibold text-[#E8F0FF]">{formatPercent(scenario.premiumPaidPercent)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#6F7F91]">Control premium</p>
          <p className="mt-1 font-semibold text-[#00C896]">{formatPercent(scenario.controlPremiumPercent)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#6F7F91]">Implied EV</p>
          <p className="mt-1 font-semibold text-[#E8F0FF]">{formatCurrency(scenario.impliedEnterpriseValue)}</p>
        </div>
      </div>
      {scenario.synergyValue ? (
        <p className="mt-4 text-xs text-[#8EA0BA]">
          Synergy value: <span className="text-[#E8F0FF]">{formatCurrency(scenario.synergyValue)}</span>
        </p>
      ) : null}
      <p className="mt-4 text-sm leading-relaxed text-[#8EA0BA]">{scenario.summary}</p>
    </motion.div>
  );
}

async function fetchWorkspace(ticker: string): Promise<WorkspaceResponse> {
  const response = await fetch(`${API_URL}/api/transactions/${encodeURIComponent(ticker)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch precedent transaction workspace.');
  }
  return response.json();
}

async function runPrecedentValuation(payload: {
  target: PrecedentTargetCompany;
  transactions: PrecedentTransaction[];
  filters?: { dealTypes?: PrecedentDealType[]; minYear?: number; sector?: string };
}): Promise<PrecedentValuationResult> {
  const response = await fetch(`${API_URL}/api/valuation/precedent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to calculate precedent transaction valuation.');
  }
  return response.json();
}

const DEFAULT_PRECEDENT_TARGET: PrecedentTargetCompany = {
  ticker: 'PRIVATE',
  companyName: 'Custom Company',
  stockPrice: 80,
  marketCap: 12_000_000_000,
  enterpriseValue: 14_000_000_000,
  revenue: 8_000_000_000,
  ebitda: 2_000_000_000,
  netIncome: 1_200_000_000,
  cash: 2_000_000_000,
  debt: 4_000_000_000,
  sharesOutstanding: 150_000_000,
  sector: 'Technology',
  industry: 'Software',
};

export default function PrecedentTransactions() {
  const workspace = useModelingWorkspace('precedent');
  const [target, setTarget] = useState<PrecedentTargetCompany | null>(null);
  const [transactions, setTransactions] = useState<PrecedentTransaction[]>([]);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  const [selectedDealTypes, setSelectedDealTypes] = useState<PrecedentDealType[]>([]);
  const [minYear, setMinYear] = useState(2018);
  const [sectorFilter, setSectorFilter] = useState('');
  const [activeScenario, setActiveScenario] = useState<PrecedentScenarioKey>('strategic');

  useEffect(() => {
    if (workspace.preferences.inputMode !== 'manual' || target) return;
    const manualTarget = {
      ...DEFAULT_PRECEDENT_TARGET,
      companyName: workspace.company.companyName || DEFAULT_PRECEDENT_TARGET.companyName,
      ticker: workspace.company.ticker || DEFAULT_PRECEDENT_TARGET.ticker,
      industry: workspace.company.industry || DEFAULT_PRECEDENT_TARGET.industry,
      sector: workspace.company.industry || DEFAULT_PRECEDENT_TARGET.sector,
    };
    setTarget(manualTarget);
    setSectorFilter(manualTarget.sector);
  }, [workspace.preferences.inputMode, workspace.company.companyName, workspace.company.ticker, workspace.company.industry, target]);

  const workspaceMutation = useMutation({
    mutationFn: fetchWorkspace,
    onSuccess: (data) => {
      workspace.applyApiCompany(data.target as unknown as Record<string, unknown>);
      workspace.setTickerQuery(data.target.ticker);
      setTarget(data.target);
      setTransactions(data.transactions);
      setAvailableSectors(data.availableSectors);
      setSectorFilter(data.target.sector);
      valuationMutation.mutate({
        target: data.target,
        transactions: data.transactions,
        filters: buildFilters(data.target.sector),
      });
    },
  });

  const valuationMutation = useMutation({ mutationFn: runPrecedentValuation });

  const buildFilters = useCallback(
    (sector: string) => ({
      dealTypes: selectedDealTypes.length ? selectedDealTypes : undefined,
      minYear,
      sector: sectorFilter || sector,
    }),
    [selectedDealTypes, minYear, sectorFilter],
  );

  const rerunValuation = useCallback(() => {
    if (!target || !transactions.length) return;
    valuationMutation.mutate({
      target,
      transactions,
      filters: buildFilters(target.sector),
    });
  }, [target, transactions, buildFilters, valuationMutation]);

  const result = valuationMutation.data;
  const activeCase = result?.scenarios[activeScenario];

  const filteredTransactions = useMemo(() => {
    if (!result) return transactions;
    return result.transactions;
  }, [result, transactions]);

  const stagger = { hidden: { opacity: 0, y: 12 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06 } }) };

  const toggleDealType = (type: PrecedentDealType) => {
    setSelectedDealTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      {/* LEFT PANEL */}
      <div className="space-y-5">
        <ModelingToolbar
          workspace={workspace}
          accent="#4F8CFF"
          title="Target company"
          onFetch={() => workspaceMutation.mutate(workspace.tickerQuery)}
          fetchPending={workspaceMutation.isPending}
          fetchError={
            workspaceMutation.error instanceof Error ? workspaceMutation.error.message : workspaceMutation.isError ? 'Load failed.' : null
          }
        />
        <p className="-mt-2 text-xs leading-relaxed text-[#6F7F91]">
          Institutional precedent set with mock M&A transactions. Real deal APIs can be wired later.
        </p>

        <Panel className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Transaction filters</p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6F7F91]">Deal type</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEAL_TYPE_OPTIONS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleDealType(type)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition',
                      selectedDealTypes.includes(type)
                        ? 'border-[#4F8CFF]/40 bg-[#4F8CFF]/15 text-[#E8F0FF]'
                        : 'border-white/[0.08] bg-[#070B14] text-[#8EA0BA] hover:border-white/15',
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6F7F91]">Min deal year</p>
              <input
                type="range"
                min={2015}
                max={2024}
                value={minYear}
                onChange={(e) => setMinYear(Number(e.target.value))}
                className="mt-2 w-full accent-[#4F8CFF]"
              />
              <p className="mt-1 text-xs text-[#8EA0BA]">{minYear}+</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6F7F91]">Sector</p>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#070B14] px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">All sectors</option>
                {availableSectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="secondary" className="w-full" onClick={rerunValuation} disabled={!target || valuationMutation.isPending}>
              Apply filters & revalue
            </Button>
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
                  'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition',
                  activeScenario === key
                    ? 'border-white/15 bg-[#070B14] text-white'
                    : 'border-transparent text-[#8EA0BA] hover:bg-white/[0.03]',
                )}
              >
                <span>{label}</span>
                <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {/* RIGHT PANEL */}
      <div className="space-y-5">
        <AnimatePresence mode="wait">
          {target ? (
            <motion.div key="loaded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {/* TARGET CARD */}
              <Panel className="p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Acquisition target</p>
                    <h3 className="mt-1 text-2xl font-semibold text-white">
                      {target.companyName}{' '}
                      <span className="text-[#4F8CFF]">({target.ticker})</span>
                    </h3>
                    <p className="mt-1 text-sm text-[#6F7F91]">
                      {target.sector} · {target.industry}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => workspaceMutation.mutate(target.ticker)} disabled={workspaceMutation.isPending}>
                    <RefreshCcw size={14} className={workspaceMutation.isPending ? 'animate-spin' : ''} />
                    Refresh
                  </Button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <MetricTile label="Enterprise value" value={formatCurrency(target.enterpriseValue)} />
                  <MetricTile label="EBITDA" value={formatCurrency(target.ebitda)} />
                  <MetricTile label="Stock price" value={formatCurrency(target.stockPrice, false)} />
                  <MetricTile
                    label="Control premium"
                    value={activeCase ? formatPercent(activeCase.controlPremiumPercent) : '—'}
                    sub={activeCase ? `${activeCase.label} case` : undefined}
                  />
                  <MetricTile label="Market cap" value={formatCurrency(target.marketCap)} />
                </div>
              </Panel>

              {/* TRANSACTION TABLE */}
              <Panel className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Transaction comps</p>
                  <h3 className="mt-1 text-sm font-semibold text-white">Precedent M&A universe</h3>
                </div>
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[#101725] text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6F7F91]">
                      <tr className="border-b border-white/[0.08]">
                        <th className="px-5 py-3">Acquirer</th>
                        <th className="px-3 py-3">Target</th>
                        <th className="px-3 py-3 text-right">Deal value</th>
                        <th className="px-3 py-3 text-right">EV/EBITDA</th>
                        <th className="px-3 py-3 text-right">EV/Rev</th>
                        <th className="px-3 py-3 text-right">Premium</th>
                        <th className="px-5 py-3 text-right">Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((row, i) => (
                        <motion.tr
                          key={row.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-white/[0.05] text-[#C5D3EA] transition hover:bg-white/[0.03]"
                        >
                          <td className="px-5 py-3 font-medium text-white">{row.acquirer}</td>
                          <td className="px-3 py-3">{row.target}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(row.dealValue)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {row.evEbitda > 0 ? formatMultiple(row.evEbitda) : '—'}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {row.evRevenue > 0 ? formatMultiple(row.evRevenue) : '—'}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-[#00C896]">
                            {formatPercent(row.premiumPaid)}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-[#8EA0BA]">{row.dealYear}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {valuationMutation.isPending ? (
                <Panel className="flex items-center justify-center gap-3 p-12">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                    <Target className="text-[#4F8CFF]" size={22} />
                  </motion.div>
                  <p className="text-sm text-[#8EA0BA]">Running precedent transaction valuation…</p>
                </Panel>
              ) : null}

              {result ? (
                <>
                  {/* VALUATION CARDS */}
                  <div className="grid gap-4 lg:grid-cols-3">
                    {SCENARIO_META.map(({ key, accent, icon }, i) => (
                      <motion.div key={key} custom={i} variants={stagger} initial="hidden" animate="show">
                        <ScenarioValuationCard scenario={result.scenarios[key]} accent={accent} icon={icon} />
                      </motion.div>
                    ))}
                  </div>

                  {/* RANGE STRIP */}
                  <Panel className="p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Takeover valuation range</p>
                    <div className="mt-4 flex flex-wrap items-end gap-6">
                      <div>
                        <p className="text-[10px] uppercase text-[#6F7F91]">Low (sponsor)</p>
                        <p className="text-xl font-semibold text-white">{formatCurrency(result.valuationRange.low, false)}</p>
                      </div>
                      <ArrowUpRight className="hidden text-[#4F8CFF] sm:block" size={18} />
                      <div>
                        <p className="text-[10px] uppercase text-[#6F7F91]">Mid</p>
                        <p className="text-xl font-semibold text-[#4F8CFF]">{formatCurrency(result.valuationRange.mid, false)}</p>
                      </div>
                      <ArrowUpRight className="hidden text-[#4F8CFF] sm:block" size={18} />
                      <div>
                        <p className="text-[10px] uppercase text-[#6F7F91]">High (scarcity)</p>
                        <p className="text-xl font-semibold text-[#FF7A90]">{formatCurrency(result.valuationRange.high, false)}</p>
                      </div>
                      <div className="ml-auto rounded-lg border border-white/[0.08] bg-[#070B14] px-4 py-2">
                        <p className="text-[10px] uppercase text-[#6F7F91]">Unaffected</p>
                        <p className="font-semibold text-[#8EA0BA]">{formatCurrency(result.valuationRange.currentPrice, false)}</p>
                      </div>
                    </div>
                  </Panel>

                  {/* CHARTS */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChartFrame title="Transaction multiple distribution" subtitle="EV / EBITDA comp buckets">
                      <ClientChart className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={result.charts.multipleDistribution}>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis dataKey="bucket" tick={{ fill: '#8EA0BA', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#8EA0BA', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<PrecedentChartTooltip valueFormatter={(v) => `${v} deals`} />} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#4F8CFF" fillOpacity={0.85} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ClientChart>
                    </ChartFrame>

                    <ChartFrame title="Premium paid analysis" subtitle="Top precedent premiums">
                      <ClientChart className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={result.charts.premiumPaidAnalysis} layout="vertical" margin={{ left: 8 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#8EA0BA', fontSize: 10 }} unit="%" />
                            <YAxis type="category" dataKey="deal" width={120} tick={{ fill: '#8EA0BA', fontSize: 9 }} />
                            <Tooltip content={<PrecedentChartTooltip valueFormatter={(v) => formatPercent(v)} />} />
                            <Bar dataKey="premium" radius={[0, 4, 4, 0]}>
                              {result.charts.premiumPaidAnalysis.map((_, i) => (
                                <Cell key={i} fill={i % 2 === 0 ? '#00C896' : '#4F8CFF'} fillOpacity={0.9} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ClientChart>
                    </ChartFrame>

                    <ChartFrame title="Valuation range" subtitle="Offer price vs unaffected">
                      <ClientChart className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={result.charts.valuationRange}>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#8EA0BA', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                            <Tooltip content={<PrecedentChartTooltip valueFormatter={(v) => formatCurrency(v, false)} />} />
                            <Bar dataKey="price" radius={[6, 6, 0, 0]}>
                              {result.charts.valuationRange.map((entry) => (
                                <Cell
                                  key={entry.label}
                                  fill={
                                    entry.scenario === 'scarcity'
                                      ? '#FF7A90'
                                      : entry.scenario === 'strategic'
                                        ? '#4F8CFF'
                                        : entry.scenario === 'sponsor'
                                          ? '#00C896'
                                          : '#6F7F91'
                                  }
                                  fillOpacity={0.9}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ClientChart>
                    </ChartFrame>

                    <ChartFrame title="Historical deal timeline" subtitle="Deal count & avg premium by year">
                      <ClientChart className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={result.charts.dealTimeline}>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis dataKey="year" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                            <YAxis yAxisId="left" tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8EA0BA', fontSize: 11 }} unit="%" />
                            <Tooltip content={<PrecedentChartTooltip />} />
                            <Line yAxisId="left" type="monotone" dataKey="dealCount" stroke="#4F8CFF" strokeWidth={2} dot={{ r: 3 }} />
                            <Line yAxisId="right" type="monotone" dataKey="avgPremium" stroke="#00C896" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </ClientChart>
                    </ChartFrame>
                  </div>

                  {/* INSIGHTS */}
                  <Panel className="p-5">
                    <div className="flex items-center gap-2">
                      <BrainCircuit size={18} className="text-[#4F8CFF]" />
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
                          <TrendingUp size={14} className="mt-1 shrink-0 text-[#4F8CFF]" />
                          {insight}
                        </motion.li>
                      ))}
                    </ul>
                  </Panel>
                </>
              ) : null}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Panel className="flex min-h-[480px] flex-col items-center justify-center p-10 text-center">
                <Target className="text-[#4F8CFF]/60" size={40} />
                <h3 className="mt-6 text-xl font-semibold text-white">Precedent transaction workspace</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[#8EA0BA]">
                  Enter a target ticker to screen comparable acquisitions, benchmark transaction multiples, and quantify
                  control-premium takeover valuation across strategic, sponsor, and scarcity cases.
                </p>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
