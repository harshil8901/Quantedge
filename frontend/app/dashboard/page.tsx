'use client';

import { Activity, Bell, Bookmark, BrainCircuit, BriefcaseBusiness, ChartNoAxesCombined, CircleDollarSign, Layers3, Newspaper, Radar } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartFrame from '@/components/charts/ChartFrame';
import ClientChart from '@/components/charts/ClientChart';
import MiniAreaChart from '@/components/charts/MiniAreaChart';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';
import { featuredNews, intelligenceCards, marketTicker, trendingStocks } from '@/lib/market-data';
import { cn } from '@/lib/utils';

const overviewData = [
  { month: 'Jan', value: 82, benchmark: 76 },
  { month: 'Feb', value: 88, benchmark: 79 },
  { month: 'Mar', value: 84, benchmark: 78 },
  { month: 'Apr', value: 96, benchmark: 82 },
  { month: 'May', value: 104, benchmark: 86 },
  { month: 'Jun', value: 117, benchmark: 91 },
  { month: 'Jul', value: 128, benchmark: 95 },
];

const movers = [
  { name: 'AI Infra', value: 28, color: '#4F8CFF' },
  { name: 'Cloud', value: 21, color: '#00C896' },
  { name: 'Energy', value: 13, color: '#F5B942' },
  { name: 'Autos', value: -8, color: '#FF5D5D' },
];

const heatmap = [
  ['NVDA', 2.8, '#00C896'],
  ['MSFT', 1.2, '#00C896'],
  ['AAPL', 0.4, '#00C896'],
  ['TSLA', -2.1, '#FF5D5D'],
  ['TCS', -0.3, '#FF5D5D'],
  ['RELIANCE', 0.9, '#00C896'],
  ['META', 1.8, '#00C896'],
  ['AMZN', -0.7, '#FF5D5D'],
] as const;

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-5 xl:grid-cols-[270px_1fr_330px]">
        <aside className="grid gap-5 xl:sticky xl:top-24 xl:self-start">
          <Panel className="p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-[#A1AAB8]">Research desk</p>
            <h1 className="mt-3 text-2xl font-semibold text-white">QuantEdge Terminal</h1>
            <div className="mt-6 grid gap-2">
              {[
                { label: 'Market Overview', icon: Activity },
                { label: 'Valuation Queue', icon: CircleDollarSign },
                { label: 'Saved Models', icon: Bookmark },
                { label: 'AI Notes', icon: BrainCircuit },
              ].map((item, index) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition duration-300',
                      index === 0 ? 'border border-[#4F8CFF]/25 bg-[#4F8CFF]/10 text-white' : 'text-[#A1AAB8] hover:bg-white/[0.05] hover:text-white',
                    )}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Radar size={16} className="text-[#4F8CFF]" />
              <p className="text-sm font-semibold text-white">Watchlist</p>
            </div>
            <div className="grid gap-3">
              {marketTicker.slice(3).map((item) => {
                const positive = item.change >= 0;

                return (
                  <div key={item.symbol} className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#070B14] px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.symbol}</p>
                      <p className="text-xs text-[#A1AAB8]">{item.price}</p>
                    </div>
                    <p className={cn('text-sm font-semibold', positive ? 'text-[#00C896]' : 'text-[#FF5D5D]')}>
                      {positive ? '+' : ''}
                      {item.change.toFixed(2)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Layers3 size={16} className="text-[#F5B942]" />
              <p className="text-sm font-semibold text-white">Saved Models</p>
            </div>
            <div className="grid gap-3 text-sm text-[#DDE8FF]">
              <p>NVDA base DCF | IC draft</p>
              <p>RELIANCE SOTP | board pack</p>
              <p>MSFT factor screen | watch</p>
            </div>
          </Panel>
        </aside>

        <section className="grid gap-5">
          <Panel className="p-6">
            <div className="grid gap-6 lg:grid-cols-[0.7fr_1fr] lg:items-end">
              <SectionHeader
                eyebrow="Dashboard"
                title="Institutional market command center."
                description="A concentrated workspace for live market context, valuation snapshots, portfolio signals, and AI research interpretation."
              />
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Portfolio alpha', value: '+18.4%', color: '#00C896' },
                  { label: 'Median upside', value: '+24.7%', color: '#4F8CFF' },
                  { label: 'Risk regime', value: 'Stable', color: '#F5B942' },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#A1AAB8]">{metric.label}</p>
                    <p className="mt-3 text-2xl font-semibold" style={{ color: metric.color }}>
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <ChartFrame title="Market Overview" subtitle="Composite portfolio value vs benchmark">
              <ClientChart className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overviewData}>
                    <defs>
                      <linearGradient id="dashboardValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F8CFF" stopOpacity={0.36} />
                        <stop offset="100%" stopColor="#4F8CFF" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#070B14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#F8FAFC' }} />
                    <Area dataKey="value" type="monotone" stroke="#4F8CFF" strokeWidth={2.4} fill="url(#dashboardValue)" />
                    <Area dataKey="benchmark" type="monotone" stroke="#00C896" strokeWidth={2} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </ClientChart>
            </ChartFrame>

            <ChartFrame title="Market Movers" subtitle="Sector contribution to research universe">
              <ClientChart className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={movers}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6F7F91', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#070B14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#F8FAFC' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {movers.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ClientChart>
            </ChartFrame>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel className="p-5">
              <div className="mb-5 flex items-center gap-2">
                <BriefcaseBusiness size={17} className="text-[#4F8CFF]" />
                <p className="text-sm font-semibold text-white">Valuation snapshots</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {intelligenceCards.map((card) => (
                  <div key={card.title} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#A1AAB8]">{card.title}</p>
                    <p className="mt-3 text-lg font-semibold text-white">{card.metric}</p>
                    <MiniAreaChart data={card.data} color={card.color} />
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-5">
              <div className="mb-5 flex items-center gap-2">
                <ChartNoAxesCombined size={17} className="text-[#00C896]" />
                <p className="text-sm font-semibold text-white">Heatmap</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {heatmap.map(([symbol, move, color]) => (
                  <div key={symbol} className="rounded-lg border border-white/[0.08] p-4" style={{ backgroundColor: `${color}14` }}>
                    <p className="text-sm font-semibold text-white">{symbol}</p>
                    <p className="mt-2 text-lg font-semibold" style={{ color }}>
                      {move > 0 ? '+' : ''}
                      {move.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>

        <aside className="grid gap-5 xl:sticky xl:top-24 xl:self-start">
          <Panel className="p-5">
            <div className="mb-5 flex items-center gap-2">
              <BrainCircuit size={17} className="text-[#4F8CFF]" />
              <p className="text-sm font-semibold text-white">AI analyst notes</p>
            </div>
            <div className="grid gap-4">
              {[
                'Terminal value exposure is elevated across AI infrastructure names; maintain WACC sensitivity in memo outputs.',
                'Quality factor remains the strongest explanatory variable in current watchlist dispersion.',
                'Peer valuation gaps are widening between software durability and cyclical recovery stories.',
              ].map((note) => (
                <div key={note} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                  <p className="text-sm leading-6 text-[#DDE8FF]">{note}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="mb-5 flex items-center gap-2">
              <Bell size={17} className="text-[#F5B942]" />
              <p className="text-sm font-semibold text-white">Market alerts</p>
            </div>
            <div className="grid gap-3">
              {trendingStocks.map((stock) => (
                <div key={stock.symbol} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                  <p className="text-sm font-semibold text-white">{stock.symbol} valuation alert</p>
                  <p className="mt-1 text-xs leading-5 text-[#A1AAB8]">Movement exceeds model sensitivity threshold.</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="mb-5 flex items-center gap-2">
              <Newspaper size={17} className="text-[#00C896]" />
              <p className="text-sm font-semibold text-white">News widget</p>
            </div>
            <div className="grid gap-4">
              {featuredNews.slice(0, 2).map((item) => (
                <div key={item.headline} className="border-b border-white/[0.08] pb-4 last:border-b-0 last:pb-0">
                  <p className="text-sm font-semibold leading-6 text-white">{item.headline}</p>
                  <p className="mt-1 text-xs text-[#A1AAB8]">{item.source} | {item.timestamp}</p>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  );
}
