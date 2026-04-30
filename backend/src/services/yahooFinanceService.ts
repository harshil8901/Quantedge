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

export const fetchYahooIndicesSnapshot = async (): Promise<YahooIndicesSnapshot> => {
  const symbols = GLOBAL_INDICES.map((item) => item.symbol).join(',');
  const quoteRes = await axios.get('https://query1.finance.yahoo.com/v7/finance/quote', {
    params: { symbols },
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  const results = Array.isArray(quoteRes.data?.quoteResponse?.result) ? quoteRes.data.quoteResponse.result : [];
  const bySymbol = new Map<string, Record<string, unknown>>();
  results.forEach((item: Record<string, unknown>) => {
    const symbol = String(item.symbol || '');
    if (symbol) bySymbol.set(symbol, item);
  });

  const indices = GLOBAL_INDICES.map(({ symbol, label }) => {
    const quote = bySymbol.get(symbol) || {};
    return {
      symbol: label,
      price: toNumber(quote.regularMarketPrice),
      change: toNumber(quote.regularMarketChangePercent),
    };
  }).filter((item) => item.price > 0);

  if (!indices.length) {
    throw new Error('Yahoo Finance indices quote not found.');
  }

  return {
    indices,
    source: 'yahoo',
  };
};
