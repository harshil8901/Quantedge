import { Bell, Bookmark, BrainCircuit } from 'lucide-react';
import MiniAreaChart from '@/components/charts/MiniAreaChart';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';

const watchlist = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA',
    trend: '+12.4%',
    status: 'High conviction',
    fairValue: '$1,180',
    data: [
      { period: '1', value: 42 },
      { period: '2', value: 51 },
      { period: '3', value: 58 },
      { period: '4', value: 74 },
      { period: '5', value: 88 },
    ],
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft',
    trend: '+4.8%',
    status: 'Quality momentum',
    fairValue: '$498',
    data: [
      { period: '1', value: 38 },
      { period: '2', value: 41 },
      { period: '3', value: 48 },
      { period: '4', value: 52 },
      { period: '5', value: 59 },
    ],
  },
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries',
    trend: '+6.1%',
    status: 'SOTP review',
    fairValue: 'INR 3,980',
    data: [
      { period: '1', value: 28 },
      { period: '2', value: 35 },
      { period: '3', value: 33 },
      { period: '4', value: 42 },
      { period: '5', value: 54 },
    ],
  },
  {
    symbol: 'TSLA',
    name: 'Tesla',
    trend: '-1.6%',
    status: 'Watch catalysts',
    fairValue: '$242',
    data: [
      { period: '1', value: 62 },
      { period: '2', value: 56 },
      { period: '3', value: 48 },
      { period: '4', value: 51 },
      { period: '5', value: 44 },
    ],
  },
];

export default function WatchlistPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <Panel className="mb-5 p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <SectionHeader
            eyebrow="Watchlist"
            title="High-conviction names under institutional review."
            description="Track valuation ranges, AI alerts, and research states for companies moving through the investment workflow."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Active names', value: '24', icon: Bookmark },
              { label: 'Alerts', value: '7', icon: Bell },
              { label: 'AI notes', value: '18', icon: BrainCircuit },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-lg border border-white/[0.08] bg-[#070B14] p-4">
                  <Icon size={17} className="text-[#4F8CFF]" />
                  <p className="mt-5 text-2xl font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[#A1AAB8]">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {watchlist.map((item) => {
          const positive = item.trend.startsWith('+');

          return (
            <Panel key={item.symbol} hover className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#A1AAB8]">{item.symbol}</p>
                  <h2 className="mt-3 text-xl font-semibold text-white">{item.name}</h2>
                </div>
                <span className={positive ? 'text-sm font-semibold text-[#00C896]' : 'text-sm font-semibold text-[#FF5D5D]'}>{item.trend}</span>
              </div>
              <MiniAreaChart data={item.data} color={positive ? '#00C896' : '#FF5D5D'} />
              <div className="mt-5 flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#070B14] px-3 py-3">
                <div>
                  <p className="text-xs text-[#A1AAB8]">Fair value</p>
                  <p className="mt-1 text-sm font-semibold text-white">{item.fairValue}</p>
                </div>
                <p className="text-right text-xs leading-5 text-[#A1AAB8]">{item.status}</p>
              </div>
            </Panel>
          );
        })}
      </section>
    </main>
  );
}
