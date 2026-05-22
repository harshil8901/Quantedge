'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, BrainCircuit, Layers, Play, Sparkles, TrendingUp } from 'lucide-react';
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
import RangeField from '@/components/forms/RangeField';
import ModelingToolbar from '@/components/modeling/ModelingToolbar';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import { useModelingWorkspace } from '@/hooks/useModelingWorkspace';
import { apiJson } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
const ACCENT = '#7C5CFF';

type FactorTiltKey = 'quality' | 'value' | 'momentum';

type FactorWeights = {
  value: number;
  quality: number;
  momentum: number;
  growth: number;
  volatility: number;
  balanceSheet: number;
};

type RankedSecurity = {
  rank: number;
  percentile: number;
  ticker: string;
  companyName: string;
  sector: string;
  marketCap: number;
  compositeScore: number;
  factorScores: {
    value: number;
    quality: number;
    momentum: number;
    growth: number;
    volatility: number;
    balanceSheet: number;
  };
};

type FactorResult = {
  tilt: FactorTiltKey;
  tiltLabel: string;
  weights: FactorWeights;
  rankings: RankedSecurity[];
  topRanked: RankedSecurity[];
  factorLeaders: {
    value: RankedSecurity | null;
    quality: RankedSecurity | null;
    momentum: RankedSecurity | null;
  };
  sectorBreakdown: Array<{ sector: string; count: number; avgComposite: number }>;
  insights: string[];
  charts: {
    factorDistribution: Array<{ factor: string; avgScore: number; fill: string }>;
    rankingScatter: Array<{ ticker: string; compositeScore: number; momentum: number; value: number }>;
    momentumHeatmap: Array<{ ticker: string; return3m: number; return6m: number; return12m: number }>;
    sectorFactorAnalysis: Array<{ sector: string; avgComposite: number; count: number }>;
    compositeHistogram: Array<{ bucket: string; count: number }>;
  };
  universeSize: number;
};

type UniverseOption = {
  id: string;
  name: string;
  description: string;
  tickerCount: number;
  sectorFocus: string;
};

const TILT_OPTIONS: Array<{ key: FactorTiltKey; label: string; accent: string }> = [
  { key: 'quality', label: 'Quality Tilt', accent: '#00C896' },
  { key: 'value', label: 'Value Tilt', accent: ACCENT },
  { key: 'momentum', label: 'Momentum Tilt', accent: '#4F8CFF' },
];

const FACTOR_KEYS: Array<{ key: keyof FactorWeights; label: string }> = [
  { key: 'value', label: 'Value' },
  { key: 'quality', label: 'Quality' },
  { key: 'momentum', label: 'Momentum' },
  { key: 'growth', label: 'Growth' },
  { key: 'volatility', label: 'Volatility' },
  { key: 'balanceSheet', label: 'Balance Sheet' },
];

const DEFAULT_WEIGHTS: Record<FactorTiltKey, FactorWeights> = {
  quality: { value: 0.1, quality: 0.35, momentum: 0.1, growth: 0.15, volatility: 0.1, balanceSheet: 0.2 },
  value: { value: 0.4, quality: 0.15, momentum: 0.1, growth: 0.1, volatility: 0.1, balanceSheet: 0.15 },
  momentum: { value: 0.08, quality: 0.12, momentum: 0.42, growth: 0.18, volatility: 0.08, balanceSheet: 0.12 },
};

function scoreColor(score: number) {
  if (score >= 1) return 'text-[#00C896]';
  if (score >= 0) return 'text-[#E8F0FF]';
  return 'text-[#FF7A90]';
}

async function fetchUniverses(): Promise<UniverseOption[]> {
  const data = await apiJson<{ universes: UniverseOption[] }>('/api/factors/universe');
  return data.universes;
}

async function calculateFactors(payload: {
  universeId: string;
  tilt: FactorTiltKey;
  weights: FactorWeights;
}): Promise<FactorResult> {
  return apiJson<FactorResult>('/api/factors/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export default function FactorEngine() {
  const workspace = useModelingWorkspace('factors');
  const [universeId, setUniverseId] = useState('sp500-core');
  const [tilt, setTilt] = useState<FactorTiltKey>('quality');
  const [weights, setWeights] = useState<FactorWeights>(DEFAULT_WEIGHTS.quality);
  const [customWeights, setCustomWeights] = useState(false);

  const universesQuery = useQuery({ queryKey: ['factor-universes'], queryFn: fetchUniverses });

  const calcMutation = useMutation({ mutationFn: calculateFactors });

  useEffect(() => {
    if (!customWeights) setWeights(DEFAULT_WEIGHTS[tilt]);
  }, [tilt, customWeights]);

  const runScreen = () => {
    if (!universeId) return;
    calcMutation.mutate({ universeId, tilt, weights });
  };

  const result = calcMutation.data;

  const updateWeight = (key: keyof FactorWeights, pct: number) => {
    setCustomWeights(true);
    setWeights((prev) => ({ ...prev, [key]: pct / 100 }));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <div className="space-y-5">
        <ModelingToolbar workspace={workspace} accent={ACCENT} title="Display & FX" showTicker={false} />
        <Panel className="p-5">
          <p className="text-xs uppercase tracking-[0.28em]" style={{ color: ACCENT }}>
            Quant Research Terminal
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Universe selection</h2>
          <div className="mt-4 space-y-2">
            {universesQuery.data?.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setUniverseId(u.id)}
                className={cn(
                  'w-full rounded-xl border px-3 py-3 text-left transition',
                  universeId === u.id
                    ? 'border-[#7C5CFF]/40 bg-[#7C5CFF]/10'
                    : 'border-white/[0.08] bg-[#070B14] hover:border-white/15',
                )}
              >
                <p className="text-sm font-semibold text-white">{u.name}</p>
                <p className="mt-1 text-xs text-[#6F7F91]">
                  {u.tickerCount} securities · {u.sectorFocus}
                </p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Factor tilt</p>
          <div className="mt-3 space-y-2">
            {TILT_OPTIONS.map(({ key, label, accent }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTilt(key)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition',
                  tilt === key ? 'border-white/15 bg-[#070B14] text-white' : 'border-transparent text-[#8EA0BA]',
                )}
              >
                <span>{label}</span>
                <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Factor weights</p>
            <button
              type="button"
              onClick={() => {
                setCustomWeights(false);
                setWeights(DEFAULT_WEIGHTS[tilt]);
              }}
              className="text-[10px] uppercase tracking-wider text-[#6F7F91] hover:text-white"
            >
              Reset tilt
            </button>
          </div>
          {FACTOR_KEYS.map(({ key, label }) => (
            <RangeField
              key={key}
              label={label}
              value={Math.round(weights[key] * 100)}
              onChange={(v) => updateWeight(key, v)}
              min={0}
              max={50}
              step={1}
            />
          ))}
          <Button className="w-full" onClick={runScreen} disabled={calcMutation.isPending}>
            <Play size={14} />
            {calcMutation.isPending ? 'Screening universe…' : 'Run factor screen'}
          </Button>
        </Panel>
      </div>

      <div className="space-y-5">
        <AnimatePresence mode="wait">
          {calcMutation.isError ? (
            <Panel className="p-5 text-sm text-[#FF7A90]">
              {calcMutation.error instanceof Error ? calcMutation.error.message : 'Screen failed.'}
            </Panel>
          ) : null}

          {result ? (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Panel className="p-5 md:p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Factor overview</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/[0.08] bg-[#070B14] p-4">
                    <p className="text-[10px] uppercase text-[#6F7F91]">Universe</p>
                    <p className="mt-2 text-xl font-semibold text-white">{result.universeSize}</p>
                    <p className="text-xs text-[#6F7F91]">securities screened</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-[#070B14] p-4">
                    <p className="text-[10px] uppercase text-[#6F7F91]">Top composite</p>
                    <p className="mt-2 text-xl font-semibold" style={{ color: ACCENT }}>
                      {result.topRanked[0]?.ticker ?? '—'}
                    </p>
                    <p className="text-xs text-[#6F7F91]">
                      {result.topRanked[0]?.compositeScore.toFixed(2)}σ score
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-[#070B14] p-4">
                    <p className="text-[10px] uppercase text-[#6F7F91]">Active tilt</p>
                    <p className="mt-2 text-lg font-semibold text-white">{result.tiltLabel}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-[#070B14] p-4">
                    <p className="text-[10px] uppercase text-[#6F7F91]">Sectors</p>
                    <p className="mt-2 text-xl font-semibold text-white">{result.sectorBreakdown.length}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {result.factorLeaders.value ? (
                    <span className="rounded-full border border-white/[0.08] bg-[#070B14] px-3 py-1 text-xs text-[#8EA0BA]">
                      Value leader: <strong className="text-white">{result.factorLeaders.value.ticker}</strong>
                    </span>
                  ) : null}
                  {result.factorLeaders.quality ? (
                    <span className="rounded-full border border-white/[0.08] bg-[#070B14] px-3 py-1 text-xs text-[#8EA0BA]">
                      Quality leader: <strong className="text-white">{result.factorLeaders.quality.ticker}</strong>
                    </span>
                  ) : null}
                  {result.factorLeaders.momentum ? (
                    <span className="rounded-full border border-white/[0.08] bg-[#070B14] px-3 py-1 text-xs text-[#8EA0BA]">
                      Momentum leader: <strong className="text-white">{result.factorLeaders.momentum.ticker}</strong>
                    </span>
                  ) : null}
                </div>
              </Panel>

              <Panel className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8EA0BA]">Screened universe</p>
                  <h3 className="mt-1 text-sm font-semibold text-white">Factor rankings</h3>
                </div>
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[#101725] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6F7F91]">
                      <tr className="border-b border-white/[0.08]">
                        <th className="px-5 py-3">#</th>
                        <th className="px-3 py-3">Ticker</th>
                        <th className="px-3 py-3">Sector</th>
                        <th className="px-3 py-3 text-right">Composite</th>
                        <th className="px-3 py-3 text-right">Value</th>
                        <th className="px-3 py-3 text-right">Quality</th>
                        <th className="px-3 py-3 text-right">Momentum</th>
                        <th className="px-5 py-3 text-right">Mkt cap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rankings.map((row, i) => (
                        <motion.tr
                          key={row.ticker}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-white/[0.05] transition hover:bg-white/[0.03]"
                        >
                          <td className="px-5 py-3 tabular-nums text-[#8EA0BA]">{row.rank}</td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-white">{row.ticker}</p>
                            <p className="text-xs text-[#6F7F91]">{row.companyName}</p>
                          </td>
                          <td className="px-3 py-3 text-[#8EA0BA]">{row.sector}</td>
                          <td className={cn('px-3 py-3 text-right font-semibold tabular-nums', scoreColor(row.compositeScore))}>
                            {row.compositeScore.toFixed(2)}
                          </td>
                          <td className={cn('px-3 py-3 text-right tabular-nums', scoreColor(row.factorScores.value))}>
                            {row.factorScores.value.toFixed(2)}
                          </td>
                          <td className={cn('px-3 py-3 text-right tabular-nums', scoreColor(row.factorScores.quality))}>
                            {row.factorScores.quality.toFixed(2)}
                          </td>
                          <td className={cn('px-3 py-3 text-right tabular-nums', scoreColor(row.factorScores.momentum))}>
                            {row.factorScores.momentum.toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-[#8EA0BA]">
                            {formatCurrency(row.marketCap)}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <div className="grid gap-4 lg:grid-cols-2">
                <ChartFrame title="Factor distribution" subtitle="Average z-scores across universe">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.charts.factorDistribution}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="factor" tick={{ fill: '#8EA0BA', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
                          {result.charts.factorDistribution.map((entry) => (
                            <Cell key={entry.factor} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="Ranking scatter" subtitle="Composite vs momentum · bubble = value">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                        <XAxis type="number" dataKey="momentum" name="Momentum" tick={{ fill: '#8EA0BA', fontSize: 10 }} />
                        <YAxis type="number" dataKey="compositeScore" name="Composite" tick={{ fill: '#8EA0BA', fontSize: 10 }} />
                        <ZAxis type="number" dataKey="value" range={[40, 400]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter data={result.charts.rankingScatter} fill={ACCENT} fillOpacity={0.75} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="Momentum heatmap" subtitle="Top 12 · 3M / 6M / 12M returns (%)">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.charts.momentumHeatmap}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="ticker" tick={{ fill: '#8EA0BA', fontSize: 9 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 10 }} unit="%" />
                        <Tooltip />
                        <Bar dataKey="return3m" fill="#4F8CFF" name="3M" />
                        <Bar dataKey="return6m" fill={ACCENT} name="6M" />
                        <Bar dataKey="return12m" fill="#00C896" name="12M" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="Sector factor analysis" subtitle="Avg composite by sector">
                  <ClientChart className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.charts.sectorFactorAnalysis} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#8EA0BA', fontSize: 10 }} />
                        <YAxis type="category" dataKey="sector" width={90} tick={{ fill: '#8EA0BA', fontSize: 9 }} />
                        <Tooltip />
                        <Bar dataKey="avgComposite" fill={ACCENT} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ClientChart>
                </ChartFrame>

                <ChartFrame title="Composite score histogram" subtitle="Cross-sectional score distribution">
                  <ClientChart className="h-48 lg:col-span-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.charts.compositeHistogram}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="bucket" tick={{ fill: '#8EA0BA', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#8EA0BA', fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill={ACCENT} radius={[6, 6, 0, 0]} />
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
                      <Sparkles size={14} className="mt-1 shrink-0" style={{ color: ACCENT }} />
                      {insight}
                    </motion.li>
                  ))}
                </ul>
              </Panel>
            </motion.div>
          ) : calcMutation.isPending ? (
            <Panel className="flex min-h-[400px] items-center justify-center gap-3 p-10">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                <BarChart3 style={{ color: ACCENT }} size={24} />
              </motion.div>
              <p className="text-sm text-[#8EA0BA]">Building factor rankings…</p>
            </Panel>
          ) : (
            <Panel className="flex min-h-[480px] flex-col items-center justify-center p-10 text-center">
              <Layers className="opacity-50" size={40} style={{ color: ACCENT }} />
              <h3 className="mt-6 text-xl font-semibold text-white">Quantitative factor workspace</h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#8EA0BA]">
                Select a universe and factor tilt, then run the screen to rank securities by composite z-score across
                value, quality, momentum, growth, volatility, and balance sheet factors.
              </p>
              <Button className="mt-6" onClick={runScreen}>
                <TrendingUp size={14} />
                Run initial screen
              </Button>
            </Panel>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
