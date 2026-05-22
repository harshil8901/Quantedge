'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ModelingToolbar from '@/components/modeling/ModelingToolbar';
import { useModelingWorkspace } from '@/hooks/useModelingWorkspace';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  BrainCircuit,
  ChevronUp,
  GripVertical,
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
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import ChartFrame from '@/components/charts/ChartFrame';
import ClientChart from '@/components/charts/ClientChart';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import { formatCurrency, formatMultiple, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type CompsMultipleKey = 'evEbitda' | 'evRevenue' | 'pe';

type CompsFinancials = {
  ticker: string;
  companyName: string;
  stockPrice: number;
  marketCap: number;
  enterpriseValue: number;
  revenue: number;
  ebitda: number;
  ebit: number;
  netIncome: number;
  cash: number;
  debt: number;
  sharesOutstanding: number;
  ebitdaMargin: number;
  revenueGrowth: number;
};

type CompsMultiples = { evEbitda: number | null; evRevenue: number | null; pe: number | null };

type CompsPeerRow = CompsFinancials & { multiples: CompsMultiples; isValid: boolean; excludeReason?: string };

type MultipleAggregate = {
  median: number | null;
  average: number | null;
  p25: number | null;
  p75: number | null;
  values: number[];
};

type CompsValuationCase = {
  label: 'Conservative' | 'Base' | 'Premium';
  multipleKey: CompsMultipleKey;
  multipleUsed: number;
  impliedEnterpriseValue: number;
  equityValue: number;
  intrinsicValuePerShare: number;
  upsideDownsidePercent: number;
  summary: string;
};

type CompsValuationResult = {
  target: CompsPeerRow;
  peers: CompsPeerRow[];
  statistics: {
    evEbitda: MultipleAggregate;
    evRevenue: MultipleAggregate;
    pe: MultipleAggregate;
  };
  valuations: {
    conservative: CompsValuationCase;
    base: CompsValuationCase;
    premium: CompsValuationCase;
  };
  selectedMultiple: CompsMultipleKey;
  insights: string[];
  charts: {
    multipleKey: CompsMultipleKey;
    peerMultipleComparison: Array<{ ticker: string; companyName: string; multiple: number; isTarget?: boolean }>;
    multipleDistribution: Array<{ ticker: string; value: number }>;
    valuationRange: Array<{ label: string; price: number }>;
    premiumDiscountScatter: Array<{ ticker: string; multiple: number; revenueGrowth: number; isTarget?: boolean }>;
  };
};

type WorkspaceResponse = {
  target: CompsFinancials;
  suggestedPeers: string[];
  peers: CompsFinancials[];
};

const MULTIPLE_OPTIONS: Array<{ key: CompsMultipleKey; label: string }> = [
  { key: 'evEbitda', label: 'EV / EBITDA' },
  { key: 'evRevenue', label: 'EV / Revenue' },
  { key: 'pe', label: 'P / E' },
];

type CompsTooltipPayload = {
  value?: number | string;
  name?: string;
  dataKey?: string | number;
};

type CompsChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: CompsTooltipPayload[];
  valueFormatter?: (value: number) => string;
};

function CompsChartTooltip({ active, payload, label, valueFormatter }: CompsChartTooltipProps) {
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

const getMultipleLabel = (key: CompsMultipleKey) =>
  MULTIPLE_OPTIONS.find((option) => option.key === key)?.label ?? key;

async function fetchWorkspace(ticker: string): Promise<WorkspaceResponse> {
  const response = await fetch(`${API_URL}/api/valuation/comps/${encodeURIComponent(ticker)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch comparable company workspace.');
  }
  return response.json();
}

async function fetchPeer(ticker: string): Promise<CompsFinancials> {
  const response = await fetch(`${API_URL}/api/valuation/comps/peer/${encodeURIComponent(ticker)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch peer company.');
  }
  return response.json();
}

async function runCompsValuation(payload: {
  target: CompsFinancials;
  peers: CompsFinancials[];
  selectedMultiple: CompsMultipleKey;
}): Promise<CompsValuationResult> {
  const response = await fetch(`${API_URL}/api/valuation/comps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to calculate comparable valuation.');
  }
  return response.json();
}

function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl border border-white/[0.08] bg-[#070B14] p-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8EA0BA]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-[#6F7F91]">{sub}</p> : null}
    </motion.div>
  );
}

function ValuationCaseCard({
  scenario,
  accent,
}: {
  scenario: CompsValuationCase;
  accent: string;
}) {
  const upside = scenario.upsideDownsidePercent;
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
      <p className="mt-4 text-3xl font-semibold text-white">{formatCurrency(scenario.intrinsicValuePerShare, false)}</p>
      <p className="mt-1 text-xs text-[#8EA0BA]">{formatMultiple(scenario.multipleUsed)} {MULTIPLE_OPTIONS.find((m) => m.key === scenario.multipleKey)?.label}</p>
      <p className={cn('mt-3 text-sm font-semibold', upside >= 0 ? 'text-[#00C896]' : 'text-[#FF6B6B]')}>
        {upside >= 0 ? '+' : ''}
        {formatPercent(upside)} vs current
      </p>
      <p className="mt-3 text-xs leading-5 text-[#94A4BE]">{scenario.summary}</p>
    </motion.div>
  );
}

const DEFAULT_COMPS_TARGET: CompsFinancials = {
  ticker: 'PRIVATE',
  companyName: 'Custom Company',
  stockPrice: 100,
  marketCap: 15_000_000_000,
  enterpriseValue: 18_000_000_000,
  revenue: 8_000_000_000,
  ebitda: 2_000_000_000,
  ebit: 1_600_000_000,
  netIncome: 1_200_000_000,
  cash: 2_000_000_000,
  debt: 5_000_000_000,
  sharesOutstanding: 150_000_000,
  ebitdaMargin: 25,
  revenueGrowth: 8,
};

export default function ComparableAnalysis() {
  const workspace = useModelingWorkspace('comps');
  const [peerInput, setPeerInput] = useState('');
  const [target, setTarget] = useState<CompsFinancials | null>(null);
  const [peerFinancials, setPeerFinancials] = useState<CompsFinancials[]>([]);
  const [selectedMultiple, setSelectedMultiple] = useState<CompsMultipleKey>('evEbitda');

  const valuationMutation = useMutation({
    mutationFn: runCompsValuation,
  });

  useEffect(() => {
    if (workspace.preferences.inputMode !== 'manual' || target) return;
    setTarget({
      ...DEFAULT_COMPS_TARGET,
      companyName: workspace.company.companyName || DEFAULT_COMPS_TARGET.companyName,
      ticker: workspace.company.ticker || DEFAULT_COMPS_TARGET.ticker,
    });
  }, [workspace.preferences.inputMode, workspace.company.companyName, workspace.company.ticker, target]);

  const workspaceMutation = useMutation({
    mutationFn: fetchWorkspace,
    onSuccess: (data) => {
      workspace.applyApiCompany(data.target as unknown as Record<string, unknown>);
      workspace.setTickerQuery(data.target.ticker);
      setTarget(data.target);
      setPeerFinancials(data.peers);
      valuationMutation.reset();
    },
  });

  const addPeerMutation = useMutation({
    mutationFn: fetchPeer,
    onSuccess: (peer) => {
      setPeerFinancials((prev) => {
        if (prev.some((item) => item.ticker === peer.ticker)) return prev;
        return [...prev, peer];
      });
      setPeerInput('');
      valuationMutation.reset();
    },
  });

  const result = valuationMutation.data;
  const showResults = valuationMutation.isSuccess && Boolean(result);

  const runValuation = useCallback(() => {
    if (!target || peerFinancials.length < 2) return;
    valuationMutation.mutate({ target, peers: peerFinancials, selectedMultiple });
  }, [target, peerFinancials, selectedMultiple, valuationMutation]);

  const removePeer = (ticker: string) => {
    setPeerFinancials((prev) => prev.filter((peer) => peer.ticker !== ticker));
    valuationMutation.reset();
  };

  const movePeer = (index: number, direction: 'up' | 'down') => {
    const next = [...peerFinancials];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setPeerFinancials(next);
  };

  const tableRows = useMemo(() => {
    if (!result) return [];
    return [result.target, ...result.peers.filter((peer) => peer.isValid)];
  }, [result]);

  const activeMultiple = result?.selectedMultiple ?? selectedMultiple;
  const activeMultipleLabel = getMultipleLabel(activeMultiple);
  const stats = result?.statistics[activeMultiple];

  const charts = useMemo((): CompsValuationResult['charts'] | null => {
    if (!result) return null;
    if (result.charts.multipleDistribution?.length) {
      return result.charts;
    }

    const rows = [result.target, ...result.peers.filter((peer) => peer.isValid)];
    const readMultiple = (row: CompsPeerRow) => row.multiples[activeMultiple] ?? 0;

    return {
      multipleKey: activeMultiple,
      peerMultipleComparison: rows
        .map((row) => ({
          ticker: row.ticker,
          companyName: row.companyName,
          multiple: readMultiple(row),
          isTarget: row.ticker === result.target.ticker,
        }))
        .filter((row) => row.multiple > 0),
      multipleDistribution: result.peers
        .filter((peer) => peer.isValid)
        .map((peer) => ({ ticker: peer.ticker, value: readMultiple(peer) }))
        .filter((row) => row.value > 0),
      valuationRange: result.charts.valuationRange ?? [],
      premiumDiscountScatter: rows
        .map((row) => ({
          ticker: row.ticker,
          multiple: readMultiple(row),
          revenueGrowth: row.revenueGrowth,
          isTarget: row.ticker === result.target.ticker,
        }))
        .filter((row) => row.multiple > 0),
    };
  }, [result, activeMultiple]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid gap-6 xl:grid-cols-[400px_1fr]"
    >
      {/* LEFT — Analyst controls */}
      <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <ModelingToolbar
          workspace={workspace}
          accent="#00C896"
          title="Target company"
          onFetch={() => workspaceMutation.mutate(workspace.tickerQuery)}
          fetchPending={workspaceMutation.isPending}
          fetchError={workspaceMutation.error?.message ?? null}
        />

        <Panel className="overflow-hidden p-5">
          <div className="flex items-center justify-between gap-3">
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-xs uppercase tracking-[0.28em] text-[#00C896]">Comps Terminal</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Peer set</h2>
            </motion.div>
            <Sparkles size={18} className="text-[#00C896]" />
          </div>

          <AnimatePresence mode="wait">
            {target ? (
              <motion.div
                key={target.ticker}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 space-y-3"
              >
                <motion.div
                  whileHover={{ boxShadow: '0 12px 40px rgba(79,140,255,0.12)' }}
                  className="rounded-xl border border-[#4F8CFF]/20 bg-gradient-to-br from-[#101725] to-[#070B14] p-4"
                >
                  <motion.div layout className="flex items-start justify-between gap-2">
                    <motion.div layout>
                      <p className="text-lg font-semibold text-white">{target.companyName}</p>
                      <p className="text-sm text-[#8EA0BA]">{target.ticker}</p>
                    </motion.div>
                    <span className="rounded-full border border-[#4F8CFF]/30 bg-[#4F8CFF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#4F8CFF]">
                      Auto-fetched
                    </span>
                  </motion.div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MetricTile label="Price" value={formatCurrency(target.stockPrice, false)} />
                    <MetricTile label="Market Cap" value={formatCurrency(target.marketCap)} />
                    <MetricTile label="EV" value={formatCurrency(target.enterpriseValue)} />
                    <MetricTile label="EBITDA" value={formatCurrency(target.ebitda)} />
                    <div className="col-span-2">
                      <MetricTile label="Revenue" value={formatCurrency(target.revenue)} />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => workspaceMutation.mutate(target.ticker)}
                    disabled={workspaceMutation.isPending}
                  >
                    <RefreshCcw size={14} className={workspaceMutation.isPending ? 'animate-spin' : ''} />
                    Refresh data
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 text-sm text-[#8EA0BA]">
                Enter a ticker to auto-fetch financials and peer set from FMP.
              </motion.p>
            )}
          </AnimatePresence>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Peer universe</h3>
            <span className="text-xs text-[#8EA0BA]">{peerFinancials.length} peers</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#6F7F91]">Auto-fetched from FMP · override manually below</p>

          <motion.div layout className="mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
            <AnimatePresence>
              {peerFinancials.map((peer, index) => (
                <motion.div
                  key={peer.ticker}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#070B14] p-3"
                >
                  <GripVertical size={14} className="shrink-0 text-[#4F5568]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{peer.ticker}</p>
                    <p className="truncate text-[11px] text-[#8EA0BA]">{peer.companyName}</p>
                    <p className="mt-1 text-[11px] text-[#6F7F91]">
                      {formatCurrency(peer.marketCap)} · EV/EBITDA{' '}
                      {formatMultiple(
                        peer.ebitda > 0 ? peer.enterpriseValue / peer.ebitda : null,
                      )}
                    </p>
                  </div>
                  <motion.div layout className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => movePeer(index, 'up')} className="rounded p-1 text-[#8EA0BA] hover:bg-white/5 hover:text-white">
                      <ChevronUp size={14} className="rotate-180" />
                    </button>
                    <button type="button" onClick={() => movePeer(index, 'down')} className="rounded p-1 text-[#8EA0BA] hover:bg-white/5 hover:text-white">
                      <ChevronUp size={14} />
                    </button>
                  </motion.div>
                  <button type="button" onClick={() => removePeer(peer.ticker)} className="rounded-lg p-2 text-[#8EA0BA] hover:bg-[#FF6B6B]/10 hover:text-[#FF6B6B]">
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <div className="mt-4 flex gap-2">
            <input
              value={peerInput}
              onChange={(event) => setPeerInput(event.target.value.toUpperCase())}
              onKeyDown={(event) => event.key === 'Enter' && peerInput && addPeerMutation.mutate(peerInput)}
              placeholder="Add peer ticker"
              className="h-10 flex-1 rounded-xl border border-white/[0.08] bg-[#070B14] px-3 text-sm text-white outline-none focus:border-[#4F8CFF]/40"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => peerInput && addPeerMutation.mutate(peerInput)}
              disabled={addPeerMutation.isPending || !peerInput.trim()}
            >
              <Plus size={14} />
            </Button>
          </div>
          {addPeerMutation.error ? <p className="mt-2 text-xs text-[#FF6B6B]">{addPeerMutation.error.message}</p> : null}
        </Panel>

        <Panel className="p-5">
          <h3 className="text-sm font-semibold text-white">Valuation multiple</h3>
          <p className="mt-1 text-xs text-[#6F7F91]">Median drives base case · percentiles for scenarios</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {MULTIPLE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setSelectedMultiple(option.key);
                  valuationMutation.reset();
                }}
                className={cn(
                  'rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition',
                  selectedMultiple === option.key
                    ? 'border-[#4F8CFF]/50 bg-[#4F8CFF]/15 text-white'
                    : 'border-white/[0.08] bg-[#070B14] text-[#8EA0BA] hover:border-white/15',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            onClick={runValuation}
            disabled={!target || peerFinancials.length < 2 || valuationMutation.isPending}
            className="mt-5 w-full"
          >
            {valuationMutation.isPending ? 'Running comps…' : 'Run comparable valuation'}
          </Button>
        </Panel>
      </div>

      {/* RIGHT — Outputs */}
      <div className="space-y-6">
        {valuationMutation.isPending ? (
          <Panel className="p-10 text-center">
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }} className="text-sm text-[#8EA0BA]">
              Building institutional comps model…
            </motion.div>
          </Panel>
        ) : null}

        {showResults && result ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[#4F8CFF]">
                Valuation basis · {activeMultipleLabel}
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              className="grid gap-4 md:grid-cols-3"
            >
              <ValuationCaseCard scenario={result.valuations.conservative} accent="#6F7F91" />
              <ValuationCaseCard scenario={result.valuations.base} accent="#4F8CFF" />
              <ValuationCaseCard scenario={result.valuations.premium} accent="#00C896" />
            </motion.div>

            {stats ? (
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: 'Median', value: stats.median },
                  { label: 'Average', value: stats.average },
                  { label: 'P25 (Conservative)', value: stats.p25 },
                  { label: 'P75 (Premium)', value: stats.p75 },
                ].map((item) => (
                  <Panel key={item.label} className="p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#8EA0BA]">{item.label}</p>
                    <p className="mt-2 text-xl font-semibold text-white">{formatMultiple(item.value)}</p>
                  </Panel>
                ))}
              </div>
            ) : null}

            <Panel className="overflow-hidden p-0">
              <div className="border-b border-white/[0.08] px-5 py-4">
                <p className="text-sm font-semibold text-white">Peer multiples comparison</p>
                <p className="mt-1 text-xs text-[#8EA0BA]">Institutional comp set · median-anchored base case</p>
              </div>
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[#101725]">
                    <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.18em] text-[#8EA0BA]">
                      <th className="px-5 py-3 font-semibold">Company</th>
                      <th className="px-3 py-3 font-semibold">EV/EBITDA</th>
                      <th className="px-3 py-3 font-semibold">EV/Revenue</th>
                      <th className="px-3 py-3 font-semibold">P/E</th>
                      <th className="px-3 py-3 font-semibold">EBITDA Margin</th>
                      <th className="px-5 py-3 font-semibold">Rev Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => (
                      <motion.tr
                        key={row.ticker}
                        whileHover={{ backgroundColor: 'rgba(79,140,255,0.06)' }}
                        className={cn(
                          'border-b border-white/[0.05] transition-colors',
                          row.ticker === result.target.ticker && 'bg-[#4F8CFF]/8',
                        )}
                      >
                        <td className="px-5 py-3">
                          <p className="font-semibold text-white">{row.ticker}</p>
                          <p className="text-[11px] text-[#6F7F91]">{row.companyName}</p>
                        </td>
                        <td className="px-3 py-3 text-[#DDE8FF]">{formatMultiple(row.multiples.evEbitda)}</td>
                        <td className="px-3 py-3 text-[#DDE8FF]">{formatMultiple(row.multiples.evRevenue)}</td>
                        <td className="px-3 py-3 text-[#DDE8FF]">{formatMultiple(row.multiples.pe)}</td>
                        <td className="px-3 py-3 text-[#94A4BE]">{formatPercent(row.ebitdaMargin)}</td>
                        <td className="px-5 py-3 text-[#94A4BE]">{formatPercent(row.revenueGrowth)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {charts ? (
            <div className="grid gap-5 xl:grid-cols-2">
              <ChartFrame title="Peer multiple comparison" subtitle={`${activeMultipleLabel} across comp universe`}>
                <ClientChart className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.peerMultipleComparison}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="ticker" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <Tooltip
                        content={<CompsChartTooltip valueFormatter={(v) => formatMultiple(v)} />}
                        cursor={{ fill: 'rgba(79,140,255,0.08)' }}
                      />
                      <Bar dataKey="multiple" name={activeMultipleLabel} radius={[4, 4, 0, 0]}>
                        {charts.peerMultipleComparison.map((entry) => (
                          <Cell key={entry.ticker} fill={entry.isTarget ? '#4F8CFF' : '#2A3F66'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>

              <ChartFrame title={`${activeMultipleLabel} distribution`} subtitle="Peer multiple dispersion">
                <ClientChart className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.multipleDistribution}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="ticker" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <Tooltip
                        content={<CompsChartTooltip valueFormatter={(v) => formatMultiple(v)} />}
                        cursor={{ fill: 'rgba(0,200,150,0.08)' }}
                      />
                      <Bar dataKey="value" name={activeMultipleLabel} fill="#00C896" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>

              <ChartFrame title="Valuation range" subtitle="Conservative · base · premium vs current">
                <ClientChart className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.valuationRange}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} tickFormatter={(v) => formatCurrency(Number(v), false)} />
                      <Tooltip
                        content={<CompsChartTooltip valueFormatter={(v) => formatCurrency(v, false)} />}
                        cursor={{ fill: 'rgba(255,255,255,0.06)' }}
                      />
                      <Bar dataKey="price" name="Share price" radius={[4, 4, 0, 0]}>
                        {charts.valuationRange.map((entry) => (
                          <Cell
                            key={entry.label}
                            fill={
                              entry.label === 'Current'
                                ? '#6F7F91'
                                : entry.label === 'Base'
                                  ? '#4F8CFF'
                                  : entry.label === 'Premium'
                                    ? '#00C896'
                                    : '#F5B942'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>

              <ChartFrame title="Premium vs growth scatter" subtitle={`${activeMultipleLabel} vs revenue growth`}>
                <ClientChart className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={charts.premiumDiscountScatter}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" dataKey="revenueGrowth" name="Rev growth (%)" tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <YAxis type="number" dataKey="multiple" name={activeMultipleLabel} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <ZAxis range={[80, 200]} />
                      <Tooltip
                        content={<CompsChartTooltip valueFormatter={(v) => formatMultiple(v)} />}
                        cursor={{ strokeDasharray: '3 3', stroke: 'rgba(79,140,255,0.4)' }}
                      />
                      <Scatter dataKey="multiple" name={activeMultipleLabel} fill="#4F8CFF">
                        {charts.premiumDiscountScatter.map((entry) => (
                          <Cell key={entry.ticker} fill={entry.isTarget ? '#4F8CFF' : '#2A4A7A'} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>
            </div>
            ) : null}

            <Panel className="p-5">
              <div className="flex items-center gap-2">
                <BrainCircuit size={18} className="text-[#4F8CFF]" />
                <p className="text-sm font-semibold text-white">Institutional insights</p>
              </div>
              <ul className="mt-4 space-y-3">
                {result.insights.map((insight, index) => (
                  <motion.li
                    key={insight}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="flex gap-3 rounded-xl border border-white/[0.06] bg-[#070B14] px-4 py-3 text-sm leading-6 text-[#C5D4EA]"
                  >
                    <TrendingUp size={16} className="mt-0.5 shrink-0 text-[#4F8CFF]" />
                    {insight}
                  </motion.li>
                ))}
              </ul>
            </Panel>
          </motion.div>
        ) : (
          !valuationMutation.isPending && !showResults && (
            <Panel className="flex min-h-[320px] flex-col items-center justify-center p-10 text-center">
              <BarChart3 size={32} className="text-[#4F8CFF]" />
              <p className="mt-4 text-lg font-semibold text-white">Comparable Company Analysis</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#8EA0BA]">
                {target && peerFinancials.length >= 2
                  ? `Loaded ${target.ticker} with ${peerFinancials.length} peers. Select a multiple and click Run comparable valuation.`
                  : target
                    ? 'Add at least 2 peers, then click Run comparable valuation.'
                    : 'Load a target ticker to auto-fetch peers and financials, then run valuation.'}
              </p>
            </Panel>
          )
        )}

        {valuationMutation.error ? (
          <p className="text-sm text-[#FF6B6B]">{valuationMutation.error.message}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
