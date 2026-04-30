'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartFrame from '@/components/charts/ChartFrame';
import ClientChart from '@/components/charts/ClientChart';
import NumberField from '@/components/forms/NumberField';
import RangeField from '@/components/forms/RangeField';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import { formatCurrency, formatPercent } from '@/lib/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type DDMInputs = {
  dividendPerShare: number;
  dividendGrowth: number;
  costOfEquity: number;
};

type DDMResult = {
  intrinsicValue: number;
  dividendForecast: number[];
  summary: string;
  scenarios: Array<{ label: string; growthRate: number; intrinsicValue: number }>;
  sensitivity: Array<{ costOfEquity: number; value: number }>;
};

const defaultInputs: DDMInputs = {
  dividendPerShare: 2.4,
  dividendGrowth: 5,
  costOfEquity: 9,
};

async function runDDM(inputs: DDMInputs): Promise<DDMResult> {
  const response = await fetch(`${API_URL}/api/valuation/ddm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  });

  if (!response.ok) {
    throw new Error('Failed to calculate dividend discount model.');
  }

  return response.json();
}

export default function DDMCalculator() {
  const [inputs, setInputs] = useState(defaultInputs);
  const mutation = useMutation({ mutationFn: runDDM });
  const result = mutation.data;

  useEffect(() => {
    if (!mutation.data && !mutation.error && !mutation.isPending) {
      mutation.mutate(inputs);
    }
    // Run the seeded dividend case once when the workspace opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forecast = result?.dividendForecast.map((value, index) => ({ year: `Y${index + 1}`, dividend: value })) ?? [];

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Panel className="p-5 xl:sticky xl:top-24 xl:self-start">
        <p className="text-xs uppercase tracking-[0.28em] text-[#F5B942]">Dividend Discount Model</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Income valuation inputs</h2>
        <p className="mt-3 text-sm leading-7 text-[#A1AAB8]">Model a stable dividend stream using payout growth and cost of equity assumptions.</p>

        <div className="mt-6 grid gap-5">
          <NumberField label="Dividend Per Share" value={inputs.dividendPerShare} onChange={(value) => setInputs((prev) => ({ ...prev, dividendPerShare: value }))} step={0.01} />
          <RangeField label="Growth Rate" value={inputs.dividendGrowth} onChange={(value) => setInputs((prev) => ({ ...prev, dividendGrowth: value }))} min={0.5} max={8} step={0.1} />
          <RangeField label="Cost of Equity" value={inputs.costOfEquity} onChange={(value) => setInputs((prev) => ({ ...prev, costOfEquity: value }))} min={5} max={14} step={0.1} />
        </div>

        <Button type="button" onClick={() => mutation.mutate(inputs)} disabled={mutation.isPending} className="mt-6 w-full">
          {mutation.isPending ? 'Running DDM...' : 'Run dividend model'}
        </Button>
        {mutation.error ? <p className="mt-4 text-sm text-[#FF5D5D]">{mutation.error.message}</p> : null}
      </Panel>

      <section className="grid gap-5">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { label: 'Intrinsic Value', value: result ? formatCurrency(result.intrinsicValue, false) : 'Pending', color: '#F5B942' },
            { label: 'Dividend Growth', value: formatPercent(inputs.dividendGrowth), color: '#00C896' },
            { label: 'Cost of Equity', value: formatPercent(inputs.costOfEquity), color: '#4F8CFF' },
          ].map((metric) => (
            <Panel key={metric.label} className="p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#A1AAB8]">{metric.label}</p>
              <p className="mt-4 text-2xl font-semibold" style={{ color: metric.color }}>
                {metric.value}
              </p>
            </Panel>
          ))}
        </div>

        {result ? (
          <>
            <div className="grid gap-5 xl:grid-cols-2">
              <ChartFrame title="Dividend Forecast" subtitle="10-year dividend per share projection">
                <ClientChart className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecast}>
                      <defs>
                        <linearGradient id="ddmForecast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F5B942" stopOpacity={0.36} />
                          <stop offset="100%" stopColor="#F5B942" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#070B14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#F8FAFC' }} formatter={(value) => formatCurrency(Number(value), false)} />
                      <Area dataKey="dividend" type="monotone" stroke="#F5B942" strokeWidth={2.4} fill="url(#ddmForecast)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>

              <ChartFrame title="Valuation Sensitivity" subtitle="Cost of equity sensitivity">
                <ClientChart className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.sensitivity}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="costOfEquity" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} tickFormatter={(value) => formatPercent(Number(value) * 100)} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#070B14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#F8FAFC' }} formatter={(value) => formatCurrency(Number(value), false)} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {result.sensitivity.map((entry, index) => (
                          <Cell key={entry.costOfEquity} fill={index === 2 ? '#F5B942' : '#4F8CFF'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
              <Panel className="p-5">
                <p className="mb-5 text-sm font-semibold text-white">Scenario outputs</p>
                <div className="grid gap-4 md:grid-cols-3">
                  {result.scenarios.map((scenario) => (
                    <div key={scenario.label} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                      <p className="text-sm font-semibold text-white">{scenario.label}</p>
                      <p className="mt-2 text-xs text-[#A1AAB8]">{formatPercent(scenario.growthRate * 100)} growth</p>
                      <p className="mt-5 text-2xl font-semibold text-[#F5B942]">{formatCurrency(scenario.intrinsicValue, false)}</p>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="p-5">
                <p className="text-sm font-semibold text-white">AI dividend note</p>
                <p className="mt-4 text-sm leading-7 text-[#DDE8FF]">{result.summary}</p>
              </Panel>
            </div>
          </>
        ) : (
          <Panel className="p-8">
            <p className="text-sm text-[#A1AAB8]">Run the dividend model to populate intrinsic value, forecast, and sensitivity outputs.</p>
          </Panel>
        )}
      </section>
    </div>
  );
}
