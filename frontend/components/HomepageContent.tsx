'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ChevronRight, Flame, Newspaper, Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import SectionHeader from '@/components/ui/SectionHeader';
import MiniAreaChart from '@/components/charts/MiniAreaChart';
import { intelligenceCards, marketTicker, trendingStocks } from '@/lib/market-data';
import { cn } from '@/lib/utils';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const topGainers = [
  { symbol: 'NVDA', name: 'NVIDIA', change: 3.8, price: '$956.12', volume: '49.2M' },
  { symbol: 'MSFT', name: 'Microsoft', change: 1.4, price: '$428.77', volume: '22.1M' },
  { symbol: 'RELIANCE', name: 'Reliance Industries', change: 0.9, price: 'INR 2,940', volume: '9.8M' },
  { symbol: 'META', name: 'Meta Platforms', change: 0.7, price: '$523.09', volume: '16.4M' },
];

const topLosers = [
  { symbol: 'TSLA', name: 'Tesla', change: -2.1, price: '$169.83', volume: '67.5M' },
  { symbol: 'NFLX', name: 'Netflix', change: -1.5, price: '$612.12', volume: '11.3M' },
  { symbol: 'BABA', name: 'Alibaba', change: -1.2, price: '$76.90', volume: '27.9M' },
  { symbol: 'INTC', name: 'Intel', change: -0.8, price: '$31.46', volume: '34.5M' },
];

type MarketMover = { symbol: string; name: string; change: number; price: number; volume: number };
type MarketMoversResponse = { gainers: MarketMover[]; losers: MarketMover[]; source: string };
type MarketIndex = { symbol: string; price: number; change: number };
type MarketIndicesResponse = { indices: MarketIndex[]; source: string };

async function fetchMarketMovers(): Promise<MarketMoversResponse> {
  const response = await fetch(`${API_URL}/api/valuation/market/movers`);
  if (!response.ok) throw new Error('Failed to fetch market movers.');
  return response.json();
}

async function fetchMarketIndices(): Promise<MarketIndicesResponse> {
  const response = await fetch(`${API_URL}/api/valuation/market/indices`);
  if (!response.ok) throw new Error('Failed to fetch market indices.');
  return response.json();
}

const newsroomFeed = [
  { category: 'TECH', headline: 'Semiconductor capex cycle accelerates amid sustained AI server demand', source: 'Street Consensus', timestamp: '12 min ago', tickers: ['AMD', 'ASML'] },
  { category: 'MACRO', headline: 'Treasury curve steepens as rate-cut expectations regain traction', source: 'Policy Watch', timestamp: '28 min ago', tickers: ['TLT', 'IEF'] },
  { category: 'ENERGY', headline: 'Refining margins improve as crude differentials remain favorable', source: 'Commodities Note', timestamp: '43 min ago', tickers: ['XOM', 'CVX'] },
  { category: 'EARNINGS', headline: 'Large-cap software margins surprise despite moderate topline growth', source: 'Earnings Desk', timestamp: '1h ago', tickers: ['CRM', 'ADBE'] },
  { category: 'BANKS', headline: 'Large-cap banks outperform as net interest margin pressure stabilizes', source: 'Macro Lens', timestamp: '1h ago', tickers: ['JPM', 'HDFCBANK'] },
  { category: 'AI', headline: 'Hyperscaler AI spend remains elevated through current budgeting cycle', source: 'QuantEdge Markets', timestamp: '1h ago', tickers: ['MSFT', 'GOOGL'] },
  { category: 'MARKETS', headline: 'Quality factor leadership persists as cyclicals lag broad index rebound', source: 'Cross Asset Daily', timestamp: '2h ago', tickers: ['SPY', 'QQQ'] },
  { category: 'CREDIT', headline: 'Private credit spreads tighten as institutional demand absorbs supply', source: 'Capital Desk', timestamp: '2h ago', tickers: ['BX', 'KKR'] },
  { category: 'FX', headline: 'Dollar softness continues as carry positioning unwinds across majors', source: 'FX Focus', timestamp: '3h ago', tickers: ['DXY', 'EURUSD'] },
  { category: 'INDIA', headline: 'India IT services trade at a discount despite margin resilience', source: 'Asia Equity Brief', timestamp: '3h ago', tickers: ['TCS', 'INFY'] },
  { category: 'AUTOS', headline: 'EV pricing competition intensifies as inventory days stay elevated', source: 'Mobility Intel', timestamp: '4h ago', tickers: ['TSLA', 'BYDDF'] },
  { category: 'HEALTH', headline: 'Managed care names rebound as utilization trends normalize sequentially', source: 'Healthcare Radar', timestamp: '4h ago', tickers: ['UNH', 'ELV'] },
  { category: 'INDUSTRIALS', headline: 'Aerospace suppliers lift guidance on persistent order backlogs', source: 'Industry Pulse', timestamp: '5h ago', tickers: ['BA', 'GE'] },
  { category: 'RETAIL', headline: 'Discretionary basket firms on stronger traffic and conversion trends', source: 'Consumer Track', timestamp: '5h ago', tickers: ['AMZN', 'WMT'] },
  { category: 'MATERIALS', headline: 'Copper-sensitive equities advance as China demand indicators improve', source: 'Global Metals', timestamp: '6h ago', tickers: ['FCX', 'RIO'] },
];

function MarketStrip({ indices }: { indices?: MarketIndex[] }) {
  const fallbackIndices = marketTicker.map((item) => ({
    symbol: item.symbol,
    price: Number(String(item.price).replace(/,/g, '')),
    change: item.change,
  }));
  const source = indices?.length ? indices : fallbackIndices;
  const tickerItems = [...source, ...source];

  return (
    <section className="overflow-hidden border-y border-white/[0.08] bg-[#070B14]/80 py-4 backdrop-blur-xl">
      <div className="ticker-track flex w-max gap-3">
        {tickerItems.map((item, index) => {
          const positive = item.change >= 0;

          return (
            <div key={`${item.symbol}-${index}`} className="flex min-w-[220px] items-center justify-between gap-5 rounded-lg border border-white/[0.08] bg-[#101725]/70 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white">{item.symbol}</p>
                <p className="mt-1 text-sm text-[#A1AAB8]">{item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
              <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', positive ? 'bg-[#00C896]/10 text-[#00C896]' : 'bg-[#FF5D5D]/10 text-[#FF5D5D]')}>
                {positive ? '+' : ''}
                {item.change.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function HomepageContent() {
  const moversQuery = useQuery({
    queryKey: ['market-movers'],
    queryFn: fetchMarketMovers,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const indicesQuery = useQuery({
    queryKey: ['market-indices'],
    queryFn: fetchMarketIndices,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const gainers = moversQuery.data?.gainers?.length ? moversQuery.data.gainers.slice(0, 4) : topGainers;
  const losers = moversQuery.data?.losers?.length ? moversQuery.data.losers.slice(0, 4) : topLosers;

  return (
    <div className="relative overflow-hidden">
      <section className="mx-auto grid max-w-[1440px] gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-28 lg:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex flex-col justify-center"
        >
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">Know What a Business Is Actually Worth.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#B8C4D6]">
            QuantEdge combines institutional valuation frameworks, AI-assisted research workflows, and premium investment intelligence into one modern analysis platform.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Button href="/dashboard" size="lg">
              Start Research
              <ArrowUpRight size={17} />
            </Button>
            <Button href="/models" variant="secondary" size="lg">
              Explore Models
              <ChevronRight size={17} />
            </Button>
          </div>

        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 34, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, ease: 'easeOut', delay: 0.08 }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#070B14] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34)] sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#4F8CFF]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#00C896]/14 blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Market scanner</h2>
              </div>
            </div>

            <div className="relative mt-6 rounded-xl border border-white/[0.08] bg-[#0A1221]/85 p-3">
              <div className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#070D19] px-3 py-3">
                <Search size={16} className="text-[#8EA0BA]" />
                <input
                  type="text"
                  placeholder="Search stocks (e.g. NVDA, AAPL, MSFT, RELIANCE)"
                  className="w-full bg-transparent text-sm text-white placeholder:text-[#7F8EA5] outline-none"
                />
                <button
                  type="button"
                  className="rounded-md bg-[#4F8CFF] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#6EA2FF]"
                >
                  Search
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {['NVDA', 'MSFT', 'AAPL', 'TSLA', 'RELIANCE', 'AMZN'].map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    className="rounded-full border border-white/[0.12] bg-white/[0.03] px-3 py-1 text-xs font-semibold text-[#DDE8FF] transition hover:border-[#4F8CFF]/45 hover:text-white"
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-xl border border-white/[0.08] bg-[#0A1221]/85 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Flame size={16} className="text-[#F5B942]" />
                  <p className="text-sm font-semibold text-white">Top gainers</p>
                </div>
                <div className="grid gap-2">
                  {gainers.map((stock) => {
                    return (
                      <div key={stock.symbol} className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#070D19] px-3 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-white">{stock.symbol}</p>
                          <p className="text-xs text-[#8C99AD]">{stock.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#00C896]">+{stock.change.toFixed(1)}%</p>
                          <p className="text-xs text-[#8C99AD]">
                            {typeof stock.price === 'number' ? `$${stock.price.toFixed(2)}` : stock.price} | Vol {typeof stock.volume === 'number' ? `${(stock.volume / 1_000_000).toFixed(1)}M` : stock.volume}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-xl border border-white/[0.08] bg-[#0A1221]/85 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Flame size={16} className="text-[#FF5D5D]" />
                    <p className="text-sm font-semibold text-white">Top losers</p>
                  </div>
                  <div className="grid gap-2">
                    {losers.map((stock) => (
                      <div key={stock.symbol} className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#070D19] px-3 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-white">{stock.symbol}</p>
                          <p className="text-xs text-[#8C99AD]">{stock.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#FF5D5D]">{stock.change.toFixed(1)}%</p>
                          <p className="text-xs text-[#8C99AD]">
                            {typeof stock.price === 'number' ? `$${stock.price.toFixed(2)}` : stock.price} | Vol {typeof stock.volume === 'number' ? `${(stock.volume / 1_000_000).toFixed(1)}M` : stock.volume}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {moversQuery.isFetching ? <p className="text-xs text-[#8EA0BA]">Updating live movers...</p> : null}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <MarketStrip indices={indicesQuery.data?.indices} />

      <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Market intelligence"
          title="Premium insight cards built for investment decisions."
          description="QuantEdge surfaces valuation signals, operating quality, factor strength, and AI-generated interpretation in one institutional view."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {intelligenceCards.map((card) => (
            <Panel key={card.title} hover className="p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#A1AAB8]">{card.title}</p>
                  <h3 className="mt-3 text-xl font-semibold text-white">{card.company}</h3>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ color: card.color, backgroundColor: `${card.color}18` }}>
                  {card.metric}
                </span>
              </div>
              <MiniAreaChart data={card.data} color={card.color} />
              <p className="mt-5 text-sm leading-6 text-[#A1AAB8]">{card.insight}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeader
              eyebrow="NEWSROOM"
              title="Market News & Insights"
              description="Latest developments across markets and institutional research."
            />
            <div className="flex flex-wrap gap-2">
              {['All', 'Markets', 'Macro', 'Tech', 'Earnings', 'AI', 'Energy'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="rounded-full border border-white/[0.08] bg-[#101725] px-3 py-1.5 text-xs font-semibold text-[#C9D3E6] transition duration-300 hover:border-[#4F8CFF]/45 hover:text-white hover:shadow-[0_0_16px_rgba(79,140,255,0.25)]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {newsroomFeed.slice(0, 15).map((item, index) => (
              <motion.article
                key={item.headline}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.24, delay: index * 0.02 }}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-white/[0.08] bg-[#101725] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-colors hover:border-[#4F8CFF]/30"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8EA0BA]">{item.category}</p>
                  <p className="text-xs text-[#8EA0BA]">{item.timestamp}</p>
                </div>
                <p className="text-[15px] font-semibold leading-6 text-[#E5EEFF]">{item.headline}</p>
                <p className="mt-2 text-xs text-[#94A4BE]">{item.source}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.tickers.map((ticker) => (
                    <span key={ticker} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-[#DDE8FF]">
                      {ticker}
                    </span>
                  ))}
                </div>
              </motion.article>
            ))}
          </motion.div>

          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-3 pb-2">
              {newsroomFeed.slice(3, 15).map((item) => (
                <motion.div
                  key={`${item.headline}-carousel`}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="w-[260px] flex-shrink-0 rounded-xl border border-white/[0.08] bg-[#101725] p-4"
                >
                  <div className="mb-3 h-16 rounded-lg bg-[radial-gradient(circle_at_20%_20%,rgba(79,140,255,0.25),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(0,200,150,0.18),transparent_55%),#0B1120]" />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#8EA0BA]">{item.category}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#DDE8FF]">{item.headline}</p>
                  <p className="mt-2 text-xs text-[#8EA0BA]">{item.timestamp}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-24 pt-8 sm:px-6 lg:px-8" />
    </div>
  );
}
