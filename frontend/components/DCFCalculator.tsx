'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowUpRight, BrainCircuit, RefreshCcw, Search, ShieldCheck } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartFrame from '@/components/charts/ChartFrame';
import ClientChart from '@/components/charts/ClientChart';
import NumberField from '@/components/forms/NumberField';
import RangeField from '@/components/forms/RangeField';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import { formatCurrency, formatDecimal, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
type ScenarioKey = 'bear' | 'base' | 'bull';

type CompanyData = {
  companyName: string;
  ticker: string;
  currentPrice: number;
  marketCap: number;
  sharesOutstanding: number;
  revenue: number;
  ebitda: number;
  ebit: number;
  netIncome: number;
  cash: number;
  debt: number;
  workingCapital: number;
  freeCashFlow: number;
  capex: number;
  depreciationAndAmortization: number;
  historicalRevenueGrowth: number;
  historicalEbitdaMargin: number;
  historicalEbitMargin: number;
  historicalFcfMargin: number;
};

type ScenarioAssumptions = {
  revenueGrowth: number;
  ebitdaMargin: number;
  ebitMargin: number;
  wacc: number;
  terminalGrowth: number;
  taxRate: number;
  capexPercent: number;
  workingCapitalPercent: number;
};

type DCFScenarioResult = {
  caseKey: ScenarioKey;
  label: string;
  enterpriseValue: number;
  equityValue: number;
  intrinsicValuePerShare: number;
  marginOfSafety: number;
  upsideDownsidePercent: number;
  terminalValue: number;
  discountedTerminalValue: number;
  terminalValueContributionPercent: number;
  projection: Array<{ year: number; revenue: number; ebitda: number; ebit: number; freeCashFlow: number; discountedCashFlow: number }>;
};

type DCFResult = {
  ticker: string;
  companyName?: string;
  currentPrice: number;
  bearCase: DCFScenarioResult;
  baseCase: DCFScenarioResult;
  bullCase: DCFScenarioResult;
  sensitivity: Array<{ wacc: number; values: Array<{ terminalGrowth: number; intrinsicValuePerShare: number }> }>;
  aiInsights: string[];
};

const defaultCompanyData: CompanyData = {
  companyName: 'NVIDIA Corporation',
  ticker: 'NVDA',
  currentPrice: 920,
  marketCap: 0,
  sharesOutstanding: 24_700_000_000,
  revenue: 60_900_000_000,
  ebitda: 33_700_000_000,
  ebit: 31_200_000_000,
  netIncome: 29_800_000_000,
  cash: 26_000_000_000,
  debt: 10_300_000_000,
  workingCapital: 14_000_000_000,
  freeCashFlow: 27_000_000_000,
  capex: 1_200_000_000,
  depreciationAndAmortization: 2_500_000_000,
  historicalRevenueGrowth: 18,
  historicalEbitdaMargin: 55,
  historicalEbitMargin: 51,
  historicalFcfMargin: 44,
};

const defaultAssumptions: Record<ScenarioKey, ScenarioAssumptions> = {
  bear: { revenueGrowth: 5, ebitdaMargin: 18, ebitMargin: 15, wacc: 12, terminalGrowth: 3, taxRate: 23, capexPercent: 6, workingCapitalPercent: 2.5 },
  base: { revenueGrowth: 8, ebitdaMargin: 22, ebitMargin: 19, wacc: 10, terminalGrowth: 4, taxRate: 21, capexPercent: 5, workingCapitalPercent: 2 },
  bull: { revenueGrowth: 12, ebitdaMargin: 26, ebitMargin: 23, wacc: 9, terminalGrowth: 5, taxRate: 20, capexPercent: 4, workingCapitalPercent: 1.5 },
};

async function fetchCompanyData(ticker: string): Promise<CompanyData> {
  const response = await fetch(`${API_URL}/api/valuation/company/${encodeURIComponent(ticker)}`);
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || 'Failed to fetch company data.');
  }
  return response.json();
}

async function runDCF(payload: { companyData: CompanyData; assumptions: Record<ScenarioKey, ScenarioAssumptions> }): Promise<DCFResult> {
  const response = await fetch(`${API_URL}/api/valuation/dcf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || 'Failed to calculate DCF valuation.');
  }
  return response.json();
}

export default function DCFCalculator() {
  const [tickerQuery, setTickerQuery] = useState('NVDA');
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('base');
  const [entryMode, setEntryMode] = useState<'auto' | 'manual'>('auto');
  const [companyData, setCompanyData] = useState<CompanyData>(defaultCompanyData);
  const [assumptions, setAssumptions] = useState<Record<ScenarioKey, ScenarioAssumptions>>(defaultAssumptions);

  const companyMutation = useMutation({
    mutationFn: fetchCompanyData,
    onSuccess: (data) => {
      setCompanyData(data);
      setEntryMode('auto');
    },
  });

  const dcfMutation = useMutation({
    mutationFn: runDCF,
  });

  const result = dcfMutation.data;

  const currentAssumptions = assumptions[activeScenario];
  const setScenarioInput = (field: keyof ScenarioAssumptions, value: number) => {
    setAssumptions((prev) => ({ ...prev, [activeScenario]: { ...prev[activeScenario], [field]: value } }));
  };
  const setCompanyNumber = (field: keyof CompanyData, value: number) => {
    setCompanyData((prev) => ({ ...prev, [field]: value }));
  };

  const runValuation = () => dcfMutation.mutate({ companyData, assumptions });
  const chartData = result?.baseCase.projection.map((point) => ({
    year: `Y${point.year}`,
    revenue: point.revenue,
    freeCashFlow: point.freeCashFlow,
    discountedCashFlow: point.discountedCashFlow,
  })) ?? [];

  const terminalMix = result
    ? [
        { label: 'PV FCF', value: result.baseCase.enterpriseValue - result.baseCase.discountedTerminalValue, color: '#4F8CFF' },
        { label: 'PV TV', value: result.baseCase.discountedTerminalValue, color: '#F5B942' },
      ]
    : [];

  const scenarioCards = useMemo(() => {
    if (!result) return [];
    return [result.bearCase, result.baseCase, result.bullCase];
  }, [result]);

  return (
    <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
      <section className="grid gap-5 xl:sticky xl:top-24 xl:self-start">
        <Panel className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4F8CFF]">Section 1</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Company Data</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEntryMode('auto')}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                entryMode === 'auto' ? 'border-[#4F8CFF]/40 bg-[#4F8CFF]/12 text-white' : 'border-white/[0.08] bg-[#070D19] text-[#A1AAB8]',
              )}
            >
              Auto Fetch
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('manual')}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                entryMode === 'manual' ? 'border-[#4F8CFF]/40 bg-[#4F8CFF]/12 text-white' : 'border-white/[0.08] bg-[#070D19] text-[#A1AAB8]',
              )}
            >
              Manual Entry
            </button>
            <span className="text-xs text-[#8EA0BA]">{entryMode === 'auto' ? 'Using latest API snapshot' : 'Analyst override mode enabled'}</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-[#070D19] px-3 py-2">
              <Search size={16} className="text-[#8EA0BA]" />
              <input
                value={tickerQuery}
                onChange={(event) => setTickerQuery(event.target.value.toUpperCase())}
                className="w-full bg-transparent text-sm text-white outline-none"
                placeholder="Enter ticker (e.g. NVDA)"
              />
            </div>
            <Button
              type="button"
              onClick={() => companyMutation.mutate(tickerQuery)}
              disabled={companyMutation.isPending}
              variant="secondary"
            >
              <RefreshCcw size={14} />
              Refresh
            </Button>
          </div>
          {entryMode === 'auto' ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {[
                ['Company Name', companyData.companyName],
                ['Ticker', companyData.ticker],
                ['Current Price', formatCurrency(companyData.currentPrice, false)],
                ['Revenue', formatCurrency(companyData.revenue)],
                ['EBITDA', formatCurrency(companyData.ebitda)],
                ['EBIT', formatCurrency(companyData.ebit)],
                ['Cash', formatCurrency(companyData.cash)],
                ['Debt', formatCurrency(companyData.debt)],
                ['Shares Outstanding', formatDecimal(companyData.sharesOutstanding, 0)],
                ['Historical Growth', formatPercent(companyData.historicalRevenueGrowth)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/[0.08] bg-[#070D19] px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8EA0BA]">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/[0.08] bg-[#070D19] px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8EA0BA]">Company Name</p>
                  <input
                    value={companyData.companyName}
                    onChange={(event) => setCompanyData((prev) => ({ ...prev, companyName: event.target.value }))}
                    className="mt-2 w-full bg-transparent text-sm font-semibold text-white outline-none"
                  />
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-[#070D19] px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8EA0BA]">Ticker</p>
                  <input
                    value={companyData.ticker}
                    onChange={(event) => setCompanyData((prev) => ({ ...prev, ticker: event.target.value.toUpperCase() }))}
                    className="mt-2 w-full bg-transparent text-sm font-semibold text-white outline-none"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField label="Current Price" value={companyData.currentPrice} onChange={(value) => setCompanyNumber('currentPrice', value)} step={0.01} />
                <NumberField label="Shares Outstanding" value={companyData.sharesOutstanding} onChange={(value) => setCompanyNumber('sharesOutstanding', value)} step={100_000} />
                <NumberField label="Revenue" value={companyData.revenue} onChange={(value) => setCompanyNumber('revenue', value)} step={100_000_000} />
                <NumberField label="EBITDA" value={companyData.ebitda} onChange={(value) => setCompanyNumber('ebitda', value)} step={50_000_000} />
                <NumberField label="EBIT" value={companyData.ebit} onChange={(value) => setCompanyNumber('ebit', value)} step={50_000_000} />
                <NumberField label="Cash" value={companyData.cash} onChange={(value) => setCompanyNumber('cash', value)} step={50_000_000} />
                <NumberField label="Debt" value={companyData.debt} onChange={(value) => setCompanyNumber('debt', value)} step={50_000_000} />
                <NumberField label="Working Capital" value={companyData.workingCapital} onChange={(value) => setCompanyNumber('workingCapital', value)} step={50_000_000} />
                <NumberField label="Free Cash Flow" value={companyData.freeCashFlow} onChange={(value) => setCompanyNumber('freeCashFlow', value)} step={50_000_000} />
                <NumberField label="CapEx" value={companyData.capex} onChange={(value) => setCompanyNumber('capex', value)} step={10_000_000} />
                <NumberField label="Revenue Growth %" value={companyData.historicalRevenueGrowth} onChange={(value) => setCompanyNumber('historicalRevenueGrowth', value)} step={0.1} />
              </div>
            </div>
          )}
        </Panel>

        <Panel className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4F8CFF]">Section 2</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Analyst Assumptions</h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(['bear', 'base', 'bull'] as ScenarioKey[]).map((caseKey) => (
              <button
                key={caseKey}
                type="button"
                onClick={() => setActiveScenario(caseKey)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-semibold transition',
                  activeScenario === caseKey ? 'border-[#4F8CFF]/40 bg-[#4F8CFF]/12 text-white' : 'border-white/[0.08] bg-[#070D19] text-[#A1AAB8]',
                )}
              >
                {caseKey === 'bear' ? 'Bear Case' : caseKey === 'bull' ? 'Bull Case' : 'Base Case'}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4">
            <RangeField label="Revenue Growth %" value={currentAssumptions.revenueGrowth} onChange={(value) => setScenarioInput('revenueGrowth', value)} min={0} max={20} step={0.1} />
            <RangeField label="EBITDA Margin %" value={currentAssumptions.ebitdaMargin} onChange={(value) => setScenarioInput('ebitdaMargin', value)} min={5} max={50} step={0.1} />
            <RangeField label="EBIT Margin %" value={currentAssumptions.ebitMargin} onChange={(value) => setScenarioInput('ebitMargin', value)} min={3} max={45} step={0.1} />
            <RangeField label="WACC %" value={currentAssumptions.wacc} onChange={(value) => setScenarioInput('wacc', value)} min={5} max={16} step={0.1} />
            <RangeField label="Terminal Growth %" value={currentAssumptions.terminalGrowth} onChange={(value) => setScenarioInput('terminalGrowth', value)} min={1} max={6} step={0.1} />
            <RangeField label="Tax Rate %" value={currentAssumptions.taxRate} onChange={(value) => setScenarioInput('taxRate', value)} min={5} max={35} step={0.1} />
            <RangeField label="CapEx %" value={currentAssumptions.capexPercent} onChange={(value) => setScenarioInput('capexPercent', value)} min={0} max={15} step={0.1} />
            <RangeField label="Working Capital %" value={currentAssumptions.workingCapitalPercent} onChange={(value) => setScenarioInput('workingCapitalPercent', value)} min={0} max={8} step={0.1} />
          </div>
          <div className="mt-4">
            <Button type="button" onClick={runValuation} disabled={dcfMutation.isPending || companyMutation.isPending} className="w-full">
              {dcfMutation.isPending ? 'Running institutional DCF...' : 'Run DCF workflow'}
              <ArrowUpRight size={15} />
            </Button>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5">
        <div className="grid gap-5 md:grid-cols-3">
          {scenarioCards.map((scenario) => (
            <Panel key={scenario.caseKey} className="p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8EA0BA]">{scenario.label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(scenario.intrinsicValuePerShare, false)}</p>
              <p className={cn('mt-1 text-sm font-semibold', scenario.upsideDownsidePercent >= 0 ? 'text-[#00C896]' : 'text-[#FF5D5D]')}>
                {formatPercent(scenario.upsideDownsidePercent)}
              </p>
              <p className="mt-3 text-xs text-[#A1AAB8]">
                EV {formatCurrency(scenario.enterpriseValue)} | Equity {formatCurrency(scenario.equityValue)}
              </p>
            </Panel>
          ))}
        </div>

        {result ? (
          <>
            <div className="grid gap-5 xl:grid-cols-2">
              <ChartFrame title="FCF Projection Chart" subtitle="10-year free cash flow trajectory">
                <ClientChart className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} tickFormatter={(value) => formatCurrency(Number(value))} />
                      <Tooltip contentStyle={{ background: '#070B14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#F8FAFC' }} formatter={(value) => formatCurrency(Number(value))} />
                      <Area dataKey="freeCashFlow" stroke="#4F8CFF" fill="rgba(79,140,255,0.2)" strokeWidth={2.4} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>

              <ChartFrame title="Discounted Cash Flow Chart" subtitle="Discounted yearly cash flows">
                <ClientChart className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} tickFormatter={(value) => formatCurrency(Number(value))} />
                      <Tooltip contentStyle={{ background: '#070B14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#F8FAFC' }} formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="discountedCashFlow" fill="#00C896" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <ChartFrame title="Revenue Growth Projection" subtitle="Revenue and cash flow progression">
                <ClientChart className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} tickFormatter={(value) => formatCurrency(Number(value))} />
                      <Tooltip contentStyle={{ background: '#070B14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#F8FAFC' }} formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Area dataKey="revenue" stroke="#4F8CFF" fill="rgba(79,140,255,0.12)" />
                      <Area dataKey="freeCashFlow" stroke="#F5B942" fill="rgba(245,185,66,0.12)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>

              <ChartFrame title="Terminal Value Contribution" subtitle={`${formatPercent(result.baseCase.terminalValueContributionPercent)} of enterprise value`}>
                <ClientChart className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={terminalMix}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} tickFormatter={(value) => formatCurrency(Number(value))} />
                      <Tooltip contentStyle={{ background: '#070B14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#F8FAFC' }} formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {terminalMix.map((entry) => <Cell key={entry.label} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>
            </div>

            <Panel className="p-5">
              <p className="mb-4 text-sm font-semibold text-white">Sensitivity Matrix</p>
              <div className="overflow-x-auto">
                <div className="min-w-[520px]">
                  <div className="grid grid-cols-6 gap-2 pb-2 text-xs uppercase tracking-[0.18em] text-[#A1AAB8]">
                    <span>WACC / Tg</span>
                    {result.sensitivity[0]?.values.map((cell) => <span key={cell.terminalGrowth}>{formatPercent(cell.terminalGrowth * 100)}</span>)}
                  </div>
                  <div className="grid gap-2">
                    {result.sensitivity.map((row) => (
                      <div key={row.wacc} className="grid grid-cols-6 gap-2">
                        <div className="rounded-lg border border-white/[0.08] bg-[#070D19] px-3 py-2 text-xs font-semibold text-white">{formatPercent(row.wacc * 100)}</div>
                        {row.values.map((cell) => (
                          <div key={`${row.wacc}-${cell.terminalGrowth}`} className="rounded-lg border border-white/[0.08] bg-[#101725] px-3 py-2 text-xs font-semibold text-white">
                            {formatCurrency(cell.intrinsicValuePerShare, false)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <BrainCircuit size={17} className="text-[#4F8CFF]" />
                <p className="text-sm font-semibold text-white">AI Insight System</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {result.aiInsights.map((insight) => (
                  <div key={insight} className="rounded-lg border border-white/[0.08] bg-[#070D19] p-4">
                    <p className="text-sm leading-7 text-[#DDE8FF]">{insight}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        ) : (
          <Panel className="p-8">
            <div className="grid gap-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.08]" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-56 animate-pulse rounded-xl bg-white/[0.04]" />
            </div>
            <p className="mt-4 text-sm text-[#A1AAB8]">Run the DCF workflow to load all scenario outputs, charts, sensitivity, and analyst insights.</p>
          </Panel>
        )}

        {companyMutation.error ? <p className="text-sm text-[#FF5D5D]">{companyMutation.error.message}</p> : null}
        {dcfMutation.error ? <p className="text-sm text-[#FF5D5D]">{dcfMutation.error.message}</p> : null}
      </section>
    </div>
  );
}
