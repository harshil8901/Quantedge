'use client';

import { useCallback, useEffect, useState } from 'react';
import ModelingToolbar from '@/components/modeling/ModelingToolbar';
import { useModelingWorkspace } from '@/hooks/useModelingWorkspace';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BrainCircuit,
  Layers,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
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
const ACCENT = '#00C2FF';

type SOTPScenarioKey = 'discounted' | 'base' | 'unlock';
type SOTPValuationMethod = 'evEbitda' | 'evRevenue' | 'dcf' | 'marketValue' | 'assetValue';

type SOTPCompanyData = {
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
  revenueGrowth: number;
  ebitdaMargin: number;
};

type SOTPSegment = {
  id: string;
  name: string;
  revenue: number;
  ebitda: number;
  growth: number;
  multiple: number;
  valuationMethod: SOTPValuationMethod;
  marketValue?: number;
  assetValue?: number;
  dcfValue?: number;
};

type SOTPAssumptions = {
  holdcoDiscountPercent: number;
  corporateAdjustment: number;
  minorityInterest: number;
};

type SOTPScenarioOutput = {
  label: string;
  scenarioKey: SOTPScenarioKey;
  grossSegmentEV: number;
  holdcoDiscountPercent: number;
  holdcoDiscountAmount: number;
  equityValue: number;
  navPerShare: number;
  upsideToMarketPercent: number;
  summary: string;
  narrative: string;
  segmentValues: Array<{
    segmentName: string;
    impliedEnterpriseValue: number;
    contributionPercent: number;
  }>;
};

type SOTPValuationResult = {
  company: SOTPCompanyData;
  assumptions: SOTPAssumptions;
  scenarios: {
    discounted: SOTPScenarioOutput;
    base: SOTPScenarioOutput;
    unlock: SOTPScenarioOutput;
  };
  insights: string[];
  charts: {
    segmentEvBreakdown: Array<{ segment: string; discounted: number; base: number; unlock: number }>;
    navBridge: Array<{ step: string; value: number; fill: string }>;
    segmentContribution: Array<{ segment: string; value: number; fill: string }>;
    holdcoDiscountAnalysis: Array<{ scenario: string; discount: number; nav: number }>;
    scenarioComparison: Array<{ label: string; nav: number; marketPrice: number }>;
  };
};

const METHOD_OPTIONS: Array<{ value: SOTPValuationMethod; label: string }> = [
  { value: 'evEbitda', label: 'EV / EBITDA' },
  { value: 'evRevenue', label: 'EV / Revenue' },
  { value: 'dcf', label: 'DCF' },
  { value: 'marketValue', label: 'Market Value' },
  { value: 'assetValue', label: 'Asset Value' },
];

const SCENARIO_META: Array<{ key: SOTPScenarioKey; label: string; accent: string }> = [
  { key: 'discounted', label: 'Discounted Holdco', accent: '#FF7A90' },
  { key: 'base', label: 'Base Segments', accent: ACCENT },
  { key: 'unlock', label: 'Unlock Value', accent: '#00C896' },
];

const newSegment = (index: number): SOTPSegment => ({
  id: `seg-${Date.now()}-${index}`,
  name: `Segment ${index + 1}`,
  revenue: 0,
  ebitda: 0,
  growth: 5,
  multiple: 10,
  valuationMethod: 'evEbitda',
});

function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-xl border border-white/[0.08] bg-[#070B14] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8EA0BA]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#6F7F91]">{sub}</p> : null}
    </motion.div>
  );
}

function ScenarioCard({ scenario, accent }: { scenario: SOTPScenarioOutput; accent: string }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101725] p-5"
      style={{ boxShadow: `0 24px 80px ${accent}18` }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-25 blur-3xl" style={{ background: accent }} />
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8EA0BA]">{scenario.label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(scenario.navPerShare, false)}</p>
      <p className="mt-1 text-xs text-[#6F7F91]">NAV per share</p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] uppercase text-[#6F7F91]">Segment EV</p>
          <p className="mt-1 font-semibold text-[#E8F0FF]">{formatCurrency(scenario.grossSegmentEV)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#6F7F91]">Holdco discount</p>
          <p className="mt-1 font-semibold text-[#FF7A90]">{formatPercent(scenario.holdcoDiscountPercent)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#6F7F91]">Equity / NAV</p>
          <p className="mt-1 font-semibold text-[#E8F0FF]">{formatCurrency(scenario.equityValue)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#6F7F91]">vs market</p>
          <p className={cn('mt-1 font-semibold', scenario.upsideToMarketPercent >= 0 ? 'text-[#00C896]' : 'text-[#FF7A90]')}>
            {scenario.upsideToMarketPercent >= 0 ? '+' : ''}
            {formatPercent(scenario.upsideToMarketPercent)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[#8EA0BA]">{scenario.summary}</p>
    </motion.div>
  );
}

async function fetchWorkspace(ticker: string) {
  const response = await fetch(`${API_URL}/api/company/sotp/${encodeURIComponent(ticker)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch SOTP workspace.');
  }
  return response.json() as Promise<{
    company: SOTPCompanyData;
    suggestedSegments: SOTPSegment[];
    suggestedAssumptions: SOTPAssumptions;
  }>;
}

async function runSOTPValuation(payload: {
  company: SOTPCompanyData;
  segments: SOTPSegment[];
  assumptions: SOTPAssumptions;
}) {
  const response = await fetch(`${API_URL}/api/valuation/sotp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to calculate SOTP valuation.');
  }
  return response.json() as Promise<SOTPValuationResult>;
}

const DEFAULT_SOTP_COMPANY: SOTPCompanyData = {
  ticker: 'PRIVATE',
  companyName: 'Custom Company',
  stockPrice: 100,
  marketCap: 20_000_000_000,
  enterpriseValue: 22_000_000_000,
  revenue: 10_000_000_000,
  ebitda: 2_500_000_000,
  netIncome: 1_500_000_000,
  cash: 3_000_000_000,
  debt: 5_000_000_000,
  sharesOutstanding: 200_000_000,
  revenueGrowth: 6,
  ebitdaMargin: 25,
};

const DEFAULT_SOTP_ASSUMPTIONS: SOTPAssumptions = {
  holdcoDiscountPercent: 15,
  corporateAdjustment: 0,
  minorityInterest: 0,
};

const DEFAULT_SOTP_SEGMENTS: SOTPSegment[] = [
  {
    id: 'seg-1',
    name: 'Core Business',
    revenue: 6_000_000_000,
    ebitda: 1_500_000_000,
    growth: 5,
    valuationMethod: 'evEbitda',
    multiple: 10,
  },
  {
    id: 'seg-2',
    name: 'Growth Unit',
    revenue: 4_000_000_000,
    ebitda: 1_000_000_000,
    growth: 12,
    valuationMethod: 'evRevenue',
    multiple: 4,
  },
];

export default function SOTPValuation() {
  const workspace = useModelingWorkspace('sotp');
  const [company, setCompany] = useState<SOTPCompanyData | null>(null);
  const [segments, setSegments] = useState<SOTPSegment[]>([]);
  const [assumptions, setAssumptions] = useState<SOTPAssumptions | null>(null);
  const [activeScenario, setActiveScenario] = useState<SOTPScenarioKey>('base');

  useEffect(() => {
    if (workspace.preferences.inputMode !== 'manual' || company) return;
    setCompany({
      ...DEFAULT_SOTP_COMPANY,
      companyName: workspace.company.companyName || DEFAULT_SOTP_COMPANY.companyName,
      ticker: workspace.company.ticker || DEFAULT_SOTP_COMPANY.ticker,
    });
    setSegments(DEFAULT_SOTP_SEGMENTS);
    setAssumptions(DEFAULT_SOTP_ASSUMPTIONS);
  }, [workspace.preferences.inputMode, workspace.company.companyName, workspace.company.ticker, company]);

  const workspaceMutation = useMutation({
    mutationFn: fetchWorkspace,
    onSuccess: (data) => {
      workspace.applyApiCompany(data.company as unknown as Record<string, unknown>);
      workspace.setTickerQuery(data.company.ticker);
      setCompany(data.company);
      setSegments(data.suggestedSegments);
      setAssumptions(data.suggestedAssumptions);
      valuationMutation.mutate({
        company: data.company,
        segments: data.suggestedSegments,
        assumptions: data.suggestedAssumptions,
      });
    },
  });

  const valuationMutation = useMutation({ mutationFn: runSOTPValuation });

  const rerun = useCallback(() => {
    if (!company || !segments.length || !assumptions) return;
    valuationMutation.mutate({ company, segments, assumptions });
  }, [company, segments, assumptions, valuationMutation]);

  const updateSegment = (id: string, patch: Partial<SOTPSegment>) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSegment = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  };

  const addSegment = () => {
    setSegments((prev) => [...prev, newSegment(prev.length)]);
  };

  const result = valuationMutation.data;
  const activeCase = result?.scenarios[activeScenario];

  const segmentImpliedEv = (segment: SOTPSegment) => {
    switch (segment.valuationMethod) {
      case 'evEbitda':
        return segment.ebitda * segment.multiple;
      case 'evRevenue':
        return segment.revenue * segment.multiple;
      case 'dcf':
        return segment.dcfValue ?? segment.ebitda * segment.multiple * 1.1;
      case 'marketValue':
        return segment.marketValue ?? 0;
      case 'assetValue':
        return segment.assetValue ?? 0;
      default:
        return 0;
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
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

        {company && assumptions ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <Panel className="space-y-4 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Holdco assumptions</p>
              <RangeField
                label="Holdco discount (base)"
                value={assumptions.holdcoDiscountPercent}
                onChange={(v) => setAssumptions({ ...assumptions, holdcoDiscountPercent: v })}
                min={0}
                max={35}
                step={1}
              />
              <NumberField
                label="Corporate adjustment"
                value={assumptions.corporateAdjustment}
                onChange={(v) => setAssumptions({ ...assumptions, corporateAdjustment: v })}
                step={1_000_000}
              />
              <NumberField
                label="Minority interest"
                value={assumptions.minorityInterest}
                onChange={(v) => setAssumptions({ ...assumptions, minorityInterest: v })}
                step={1_000_000}
              />
            </Panel>

            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Segment builder</p>
                <button
                  type="button"
                  onClick={addSegment}
                  className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-xs text-[#8EA0BA] transition hover:border-[#00C2FF]/40 hover:text-white"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {segments.map((segment) => (
                  <motion.div
                    key={segment.id}
                    layout
                    className="rounded-xl border border-white/[0.08] bg-[#070B14] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={segment.name}
                        onChange={(e) => updateSegment(segment.id, { name: e.target.value })}
                        className="flex-1 bg-transparent text-sm font-semibold text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeSegment(segment.id)}
                        className="text-[#6F7F91] transition hover:text-[#FF7A90]"
                        aria-label="Remove segment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <select
                      value={segment.valuationMethod}
                      onChange={(e) =>
                        updateSegment(segment.id, { valuationMethod: e.target.value as SOTPValuationMethod })
                      }
                      className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#101725] px-2 py-1.5 text-xs text-white"
                    >
                      {METHOD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <NumberField
                        label="Revenue"
                        value={segment.revenue}
                        onChange={(v) => updateSegment(segment.id, { revenue: v })}
                        step={1_000_000}
                        compact
                      />
                      <NumberField
                        label="EBITDA"
                        value={segment.ebitda}
                        onChange={(v) => updateSegment(segment.id, { ebitda: v })}
                        step={1_000_000}
                        compact
                      />
                      <NumberField
                        label="Multiple"
                        value={segment.multiple}
                        onChange={(v) => updateSegment(segment.id, { multiple: v })}
                        step={0.5}
                        suffix="x"
                        compact
                      />
                      <NumberField
                        label="Growth"
                        value={segment.growth}
                        onChange={(v) => updateSegment(segment.id, { growth: v })}
                        step={0.5}
                        suffix="%"
                        compact
                      />
                    </div>
                    {(segment.valuationMethod === 'marketValue' || segment.valuationMethod === 'assetValue' || segment.valuationMethod === 'dcf') && (
                      <NumberField
                        label={
                          segment.valuationMethod === 'dcf'
                            ? 'DCF value'
                            : segment.valuationMethod === 'marketValue'
                              ? 'Market value'
                              : 'Asset value'
                        }
                        value={
                          segment.valuationMethod === 'dcf'
                            ? segment.dcfValue ?? 0
                            : segment.valuationMethod === 'marketValue'
                              ? segment.marketValue ?? 0
                              : segment.assetValue ?? 0
                        }
                        onChange={(v) => {
                          if (segment.valuationMethod === 'dcf') updateSegment(segment.id, { dcfValue: v });
                          else if (segment.valuationMethod === 'marketValue') updateSegment(segment.id, { marketValue: v });
                          else updateSegment(segment.id, { assetValue: v });
                        }}
                        step={1_000_000}
                        compact
                      />
                    )}
                    <p className="mt-2 text-xs text-[#6F7F91]">
                      Implied EV: <span className="font-medium text-[#00C2FF]">{formatCurrency(segmentImpliedEv(segment))}</span>
                    </p>
                  </motion.div>
                ))}
              </div>
              <Button className="mt-4 w-full" onClick={rerun} disabled={valuationMutation.isPending || !segments.length}>
                {valuationMutation.isPending ? 'Valuing segments…' : 'Run SOTP valuation'}
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
                    <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Company overview</p>
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
                  <MetricTile label="Market cap" value={formatCurrency(company.marketCap)} />
                  <MetricTile label="Enterprise value" value={formatCurrency(company.enterpriseValue)} />
                  <MetricTile label="Revenue" value={formatCurrency(company.revenue)} />
                  <MetricTile label="Segments" value={String(segments.length)} />
                  <MetricTile
                    label="Holdco discount"
                    value={activeCase ? formatPercent(activeCase.holdcoDiscountPercent) : '—'}
                    sub={activeCase?.label}
                  />
                </div>
              </Panel>

              <div className="grid gap-4 lg:grid-cols-3">
                {SCENARIO_META.map(({ key, accent }) => (
                  <ScenarioCard key={key} scenario={result.scenarios[key]} accent={accent} />
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
                        activeScenario === key
                          ? 'border-white/20 bg-[#070B14] text-white'
                          : 'border-transparent text-[#8EA0BA] hover:bg-white/[0.04]',
                      )}
                    >
                      <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
                      {label}
                    </button>
                  ))}
                </div>
                {activeCase ? <p className="mt-4 text-sm leading-relaxed text-[#8EA0BA]">{activeCase.narrative}</p> : null}
              </Panel>

              <div className="grid gap-4 lg:grid-cols-2 [&>*:last-child]:lg:col-span-2">
                <ChartFrame title="Segment EV breakdown" subtitle="EV by segment · scenario comparison">
                  <ClientChart className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.charts.segmentEvBreakdown}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="segment" tick={{ fill: '#8EA0BA', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1e9).toFixed(0)}B`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="discounted" fill="#FF7A90" radius={[4, 4, 0, 0]} name="Discounted" />
                        <Bar dataKey="base" fill={ACCENT} radius={[4, 4, 0, 0]} name="Base" />
                        <Bar dataKey="unlock" fill="#00C896" radius={[4, 4, 0, 0]} name="Unlock" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="Segment contribution" subtitle="Base case EV mix">
                  <ClientChart className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={result.charts.segmentContribution}
                          dataKey="value"
                          nameKey="segment"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {result.charts.segmentContribution.map((entry) => (
                            <Cell key={entry.segment} fill={entry.fill} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="NAV bridge" subtitle="Base case value build-up">
                  <ClientChart className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.charts.navBridge}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="step" tick={{ fill: '#8EA0BA', fontSize: 8 }} interval={0} angle={-12} textAnchor="end" height={50} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1e9).toFixed(0)}B`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {result.charts.navBridge.map((entry) => (
                            <Cell key={entry.step} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="Holdco discount analysis" subtitle="Discount % vs NAV by scenario">
                  <ClientChart className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.charts.holdcoDiscountAnalysis}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="scenario" tick={{ fill: '#8EA0BA', fontSize: 9 }} />
                        <YAxis yAxisId="left" tick={{ fill: '#8EA0BA', fontSize: 10 }} unit="%" />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8EA0BA', fontSize: 10 }} />
                        <Tooltip />
                        <Line yAxisId="left" type="monotone" dataKey="discount" stroke="#FF7A90" strokeWidth={2} name="Discount %" />
                        <Line yAxisId="right" type="monotone" dataKey="nav" stroke={ACCENT} strokeWidth={2} name="NAV" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="Valuation scenario comparison" subtitle="NAV vs market price">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.charts.scenarioComparison}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: '#8EA0BA', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => formatCurrency(v, false)} />
                        <Bar dataKey="nav" fill={ACCENT} name="NAV / share" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="marketPrice" fill="#6F7F91" name="Market" radius={[6, 6, 0, 0]} />
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
                      <TrendingUp size={14} className="mt-1 shrink-0" style={{ color: ACCENT }} />
                      {insight}
                    </motion.li>
                  ))}
                </ul>
              </Panel>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Panel className="flex min-h-[520px] flex-col items-center justify-center p-10 text-center">
                <Layers className="opacity-50" size={40} style={{ color: ACCENT }} />
                <h3 className="mt-6 text-xl font-semibold text-white">Sum-of-the-parts workspace</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[#8EA0BA]">
                  Enter a conglomerate or multi-segment ticker to build segment structure, value each unit independently,
                  and quantify NAV with holdco discount and unlock scenarios.
                </p>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
