'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartFrame from '@/components/charts/ChartFrame';
import ClientChart from '@/components/charts/ClientChart';
import NumberField from '@/components/forms/NumberField';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import { formatCurrency } from '@/lib/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type CompsInputs = {
  revenue: number;
  ebitda: number;
  netIncome: number;
  sharePrice: number;
  enterpriseValue: number;
  peerMultiple: number;
  sharesOutstanding: number;
  peerMultiples: number[];
};

type CompsResult = {
  evEbitda: number;
  pe: number;
  evSales: number;
  impliedEnterpriseValue: number;
  impliedSharePrice: number;
  valuationRange: { low: number; high: number };
  scenarios: Array<{ label: string; multiple: number; impliedEnterpriseValue: number; impliedSharePrice: number }>;
  peerComparison: Array<{ peer: string; multiple: number }>;
  multipleDistribution: Array<{ bucket: string; count: number }>;
};

const defaultInputs: CompsInputs = {
  revenue: 8_400_000_000,
  ebitda: 2_050_000_000,
  netIncome: 1_120_000_000,
  sharePrice: 84,
  enterpriseValue: 21_800_000_000,
  peerMultiple: 12.4,
  sharesOutstanding: 260_000_000,
  peerMultiples: [9.8, 11.6, 12.4, 13.1, 14.2],
};

async function runComps(inputs: CompsInputs): Promise<CompsResult> {
  const response = await fetch(`${API_URL}/api/valuation/comps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  });

  if (!response.ok) {
    throw new Error('Failed to calculate comparable company analysis.');
  }

  return response.json();
}

export default function CompsCalculator() {
  const [inputs, setInputs] = useState(defaultInputs);
  const mutation = useMutation({ mutationFn: runComps });
  const result = mutation.data;

  useEffect(() => {
    if (!mutation.data && !mutation.error && !mutation.isPending) {
      mutation.mutate(inputs);
    }
    // Run the seeded peer set once when the workspace opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setInput = (field: keyof CompsInputs, value: number) => setInputs((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Panel className="p-5 xl:sticky xl:top-24 xl:self-start">
        <p className="text-xs uppercase tracking-[0.28em] text-[#00C896]">Comparable Company Analysis</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Peer valuation inputs</h2>
        <p className="mt-3 text-sm leading-7 text-[#A1AAB8]">Benchmark enterprise value, EBITDA, earnings, and shares against peer multiples.</p>

        <div className="mt-6 grid gap-4">
          <NumberField label="Revenue" value={inputs.revenue} onChange={(value) => setInput('revenue', value)} step={100_000_000} />
          <NumberField label="EBITDA" value={inputs.ebitda} onChange={(value) => setInput('ebitda', value)} step={50_000_000} />
          <NumberField label="Net Income" value={inputs.netIncome} onChange={(value) => setInput('netIncome', value)} step={50_000_000} />
          <NumberField label="Share Price" value={inputs.sharePrice} onChange={(value) => setInput('sharePrice', value)} step={0.01} />
          <NumberField label="Enterprise Value" value={inputs.enterpriseValue} onChange={(value) => setInput('enterpriseValue', value)} step={100_000_000} />
          <NumberField label="Peer EV/EBITDA Multiple" value={inputs.peerMultiple} onChange={(value) => setInput('peerMultiple', value)} step={0.1} />
          <NumberField label="Shares Outstanding" value={inputs.sharesOutstanding} onChange={(value) => setInput('sharesOutstanding', value)} step={1_000_000} />
        </div>

        <Button type="button" onClick={() => mutation.mutate(inputs)} disabled={mutation.isPending} className="mt-6 w-full">
          {mutation.isPending ? 'Running analysis...' : 'Run comparison'}
        </Button>
        {mutation.error ? <p className="mt-4 text-sm text-[#FF5D5D]">{mutation.error.message}</p> : null}
      </Panel>

      <section className="grid gap-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'EV / EBITDA', value: result ? `${result.evEbitda.toFixed(1)}x` : 'Pending', color: '#00C896' },
            { label: 'P / E', value: result ? `${result.pe.toFixed(1)}x` : 'Pending', color: '#4F8CFF' },
            { label: 'Implied EV', value: result ? formatCurrency(result.impliedEnterpriseValue) : 'Pending', color: '#F5B942' },
            { label: 'Implied Share', value: result ? formatCurrency(result.impliedSharePrice, false) : 'Pending', color: '#00C896' },
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
              <ChartFrame title="Peer Comparison" subtitle="EV/EBITDA multiple by peer">
                <ClientChart className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.peerComparison}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="peer" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#070B14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#F8FAFC' }} />
                      <Bar dataKey="multiple" radius={[4, 4, 0, 0]}>
                        {result.peerComparison.map((entry, index) => (
                          <Cell key={entry.peer} fill={index === 2 ? '#00C896' : '#4F8CFF'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>

              <ChartFrame title="Valuation Range" subtitle="Conservative, base, and premium cases">
                <ClientChart className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.scenarios}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} tickFormatter={(value) => formatCurrency(Number(value), false)} />
                      <Tooltip contentStyle={{ background: '#070B14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#F8FAFC' }} formatter={(value) => formatCurrency(Number(value), false)} />
                      <Line dataKey="impliedSharePrice" type="monotone" stroke="#00C896" strokeWidth={2.4} dot={{ fill: '#00C896', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ClientChart>
              </ChartFrame>
            </div>

            <Panel className="p-5">
              <p className="mb-5 text-sm font-semibold text-white">Scenario outputs</p>
              <div className="grid gap-4 md:grid-cols-3">
                {result.scenarios.map((scenario) => (
                  <div key={scenario.label} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                    <p className="text-sm font-semibold text-white">{scenario.label}</p>
                    <p className="mt-2 text-xs text-[#A1AAB8]">{scenario.multiple.toFixed(1)}x EV/EBITDA</p>
                    <p className="mt-5 text-2xl font-semibold text-[#00C896]">{formatCurrency(scenario.impliedSharePrice, false)}</p>
                    <p className="mt-1 text-xs text-[#A1AAB8]">{formatCurrency(scenario.impliedEnterpriseValue)} implied EV</p>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        ) : (
          <Panel className="p-8">
            <p className="text-sm text-[#A1AAB8]">Run the comparison to populate peer multiples and valuation range outputs.</p>
          </Panel>
        )}
      </section>
    </div>
  );
}
