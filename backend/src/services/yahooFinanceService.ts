import axios from 'axios';

const toNumber = (value: unknown): number => (typeof value === 'number' ? value : Number(value ?? 0)) || 0;

export interface YahooSnapshot {
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
  source: 'yahoo';
}

export interface IndexSnapshot {
  symbol: string;
  price: number;
  change: number;
}

export interface YahooIndicesSnapshot {
  indices: IndexSnapshot[];
  source: 'yahoo';
}

const GLOBAL_INDICES: Array<{ symbol: string; label: string }> = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^NDX', label: 'NASDAQ 100' },
  { symbol: '^DJI', label: 'DOW JONES' },
  { symbol: '^RUT', label: 'RUSSELL 2000' },
  { symbol: '^VIX', label: 'VIX' },
  { symbol: '^FTSE', label: 'FTSE 100' },
  { symbol: '^GDAXI', label: 'DAX' },
  { symbol: '^FCHI', label: 'CAC 40' },
  { symbol: '^STOXX50E', label: 'EURO STOXX 50' },
  { symbol: '^N225', label: 'NIKKEI 225' },
  { symbol: '^TOPX', label: 'TOPIX' },
  { symbol: '^HSI', label: 'HANG SENG' },
  { symbol: '000001.SS', label: 'SHANGHAI COMP' },
  { symbol: '399300.SZ', label: 'CSI 300' },
  { symbol: '^KS11', label: 'KOSPI' },
  { symbol: '^NSEI', label: 'NIFTY 50' },
  { symbol: '^BSESN', label: 'SENSEX' },
  { symbol: '^NSEBANK', label: 'NIFTY BANK' },
  { symbol: '^BVSP', label: 'BOVESPA' },
  { symbol: '^GSPTSE', label: 'TSX' },
  { symbol: '^AXJO', label: 'ASX 200' },
];

export const fetchYahooSnapshot = async (ticker: string): Promise<YahooSnapshot> => {
  const symbol = ticker.toUpperCase();
  const quoteRes = await axios.get('https://query1.finance.yahoo.com/v7/finance/quote', {
    params: { symbols: symbol },
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  const quote = quoteRes.data?.quoteResponse?.result?.[0];
  if (!quote) {
    throw new Error('Yahoo Finance quote not found.');
  }

  const price = toNumber(quote.regularMarketPrice);
  const marketCap = toNumber(quote.marketCap);
  const sharesOutstanding = toNumber(quote.sharesOutstanding);
  const revenue = toNumber(quote.totalRevenue);
  const ebitda = toNumber(quote.ebitda);
  const ebit = toNumber(quote.ebitda) * 0.88;
  const netIncome = toNumber(quote.trailingAnnualDividendRate) * sharesOutstanding || ebit * 0.7;
  const freeCashFlow = ebitda * 0.5;
  const capex = Math.max(revenue * 0.03, 1);

  return {
    companyName: quote.longName || quote.shortName || symbol,
    ticker: quote.symbol || symbol,
    currentPrice: price,
    marketCap,
    sharesOutstanding,
    revenue,
    ebitda,
    ebit,
    netIncome,
    cash: Math.max(0, marketCap * 0.03),
    debt: Math.max(0, marketCap * 0.02),
    workingCapital: Math.max(0, marketCap * 0.015),
    freeCashFlow,
    capex,
    depreciationAndAmortization: Math.max(ebitda - ebit, 0),
    historicalRevenueGrowth: 8,
    historicalEbitdaMargin: revenue > 0 ? (ebitda / revenue) * 100 : 0,
    historicalEbitMargin: revenue > 0 ? (ebit / revenue) * 100 : 0,
    historicalFcfMargin: revenue > 0 ? (freeCashFlow / revenue) * 100 : 0,
    source: 'yahoo',
  };
};

const YAHOO_CHART_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; QuantEdge/1.0)' };

const fetchYahooChartIndex = async (symbol: string): Promise<{ price: number; change: number } | null> => {
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`, {
      params: { interval: '1d', range: '1d' },
      headers: YAHOO_CHART_HEADERS,
      timeout: 12_000,
    });
    const meta = response.data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = toNumber(meta.regularMarketPrice);
    const previousClose = toNumber(meta.chartPreviousClose);
    if (price <= 0) return null;

    const change =
      toNumber(meta.regularMarketChangePercent) ||
      (previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0);

    return { price, change: Number(change.toFixed(2)) };
  } catch {
    return null;
  }
};

export const fetchYahooIndicesSnapshot = async (): Promise<YahooIndicesSnapshot> => {
  const settled = await Promise.all(
    GLOBAL_INDICES.map(async ({ symbol, label }) => {
      const quote = await fetchYahooChartIndex(symbol);
      if (!quote) return null;
      return { symbol: label, price: quote.price, change: quote.change };
    }),
  );

  const indices = settled.filter((item): item is IndexSnapshot => item !== null);

  if (!indices.length) {
    throw new Error('Yahoo Finance chart feed returned no index quotes.');
  }

  return {
    indices,
    source: 'yahoo',
  };
};
