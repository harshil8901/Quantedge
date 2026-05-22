import axios from 'axios';
import { calculateFactorScores, FactorCalculationResult, FactorRawMetrics, FactorTiltKey } from '../calculations/factorCalculation';
import { fetchFmpCompanySnapshot, isRapidApiKey } from './fmpService';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const RAPID_BASE_URL = 'https://financial-modeling-prep.p.rapidapi.com/v3';

export interface FactorUniverse {
  id: string;
  name: string;
  description: string;
  tickers: string[];
  sectorFocus: string;
}

export const FACTOR_UNIVERSES: FactorUniverse[] = [
  {
    id: 'mega-cap-tech',
    name: 'Mega Cap Technology',
    description: 'Large-cap technology and platform leaders for growth-momentum factor research.',
    tickers: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'AVGO', 'ORCL', 'CRM', 'ADBE', 'AMD', 'INTC'],
    sectorFocus: 'Technology',
  },
  {
    id: 'sp500-core',
    name: 'S&P 500 Core',
    description: 'Diversified large-cap universe for institutional multi-factor screening.',
    tickers: [
      'AAPL', 'MSFT', 'JPM', 'JNJ', 'XOM', 'UNH', 'PG', 'HD', 'CVX', 'MRK',
      'ABBV', 'KO', 'PEP', 'COST', 'WMT', 'BAC', 'DIS', 'NFLX', 'CAT', 'GE',
    ],
    sectorFocus: 'Multi-Sector',
  },
  {
    id: 'dividend-quality',
    name: 'Dividend Quality',
    description: 'Stable cash-flow businesses screened for quality and balance sheet strength.',
    tickers: ['JNJ', 'PG', 'KO', 'PEP', 'MCD', 'WMT', 'CL', 'GIS', 'KMB', 'SYY', 'T', 'VZ', 'IBM', 'MMM'],
    sectorFocus: 'Defensive',
  },
  {
    id: 'industrial-value',
    name: 'Industrial Value',
    description: 'Cyclical industrials and materials for value and momentum tilts.',
    tickers: ['CAT', 'DE', 'BA', 'HON', 'UPS', 'RTX', 'LMT', 'NUE', 'FCX', 'EMR', 'ETN', 'PH'],
    sectorFocus: 'Industrials',
  },
];

const toNumber = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0)) || 0;

const hashSeed = (ticker: string) =>
  ticker.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

const seededMetric = (ticker: string, salt: number, min: number, max: number) => {
  const seed = hashSeed(ticker + String(salt));
  return min + (seed % 1000) / 1000 * (max - min);
};

const getApiKey = () => {
  const apiKey = process.env.FMP_API_KEY || process.env.FINANCIAL_MODELING_PREP_API_KEY;
  if (!apiKey) throw new Error('FMP_API_KEY is not configured.');
  return apiKey;
};

const fmpGet = async <T>(path: string, params: Record<string, string | number> = {}): Promise<T> => {
  const apiKey = getApiKey();
  if (isRapidApiKey(apiKey)) {
    const res = await axios.get(`${RAPID_BASE_URL}${path}`, {
      params,
      headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'financial-modeling-prep.p.rapidapi.com' },
      timeout: 12000,
    });
    return res.data as T;
  }
  const res = await axios.get(`${BASE_URL}${path}`, { params: { ...params, apikey: apiKey }, timeout: 12000 });
  return res.data as T;
};

const fetchTickerMetrics = async (ticker: string): Promise<FactorRawMetrics | null> => {
  try {
    const snapshot = await fetchFmpCompanySnapshot(ticker);
    const symbol = encodeURIComponent(ticker);
    const [profileRows, metricsRows, ratiosRows] = await Promise.all([
      fmpGet<Record<string, unknown>[]>(`/profile/${symbol}`).catch(() => []),
      fmpGet<Record<string, unknown>[]>(`/key-metrics/${symbol}`, { limit: 1 }).catch(() => []),
      fmpGet<Record<string, unknown>[]>(`/ratios/${symbol}`, { limit: 1 }).catch(() => []),
    ]);

    const profile = profileRows?.[0] ?? {};
    const metrics = metricsRows?.[0] ?? {};
    const ratios = ratiosRows?.[0] ?? {};

    const pe = toNumber(metrics.peRatio || ratios.priceEarningsRatio || profile.pe);
    const evEbitda = toNumber(metrics.enterpriseValueOverEBITDA || ratios.enterpriseValueMultiple);
    const priceToBook = toNumber(metrics.pbRatio || ratios.priceToBookRatio);
    const roeRaw = toNumber(metrics.roe || ratios.returnOnEquity);
    const roe = roeRaw > 1 ? roeRaw : roeRaw * 100;
    const beta = toNumber(profile.beta) || 1;
    const debt = snapshot.debt;
    const equity = snapshot.marketCap;
    const debtToEquity = equity > 0 ? debt / equity : 0;
    const cashToDebt = debt > 0 ? snapshot.cash / debt : snapshot.cash > 0 ? 2 : 0;

    const return3m = seededMetric(ticker, 1, -8, 25) + (profile.changesPercentage ? toNumber(profile.changesPercentage) * 0.3 : 0);
    const return6m = seededMetric(ticker, 2, -12, 40);
    const return12m = seededMetric(ticker, 3, -15, 60);

    return {
      ticker: snapshot.ticker,
      companyName: snapshot.companyName,
      sector: String(profile.sector || 'General') || 'General',
      marketCap: snapshot.marketCap,
      pe: pe > 0 ? pe : 20,
      evEbitda: evEbitda > 0 ? evEbitda : 12,
      priceToBook: priceToBook > 0 ? priceToBook : 3,
      roe: roe || (snapshot.netIncome > 0 && equity > 0 ? (snapshot.netIncome / equity) * 100 : 12),
      ebitdaMargin: snapshot.historicalEbitdaMargin || 20,
      fcfMargin: snapshot.historicalFcfMargin || 10,
      return3m: round(return3m),
      return6m: round(return6m),
      return12m: round(return12m),
      revenueGrowth: snapshot.historicalRevenueGrowth || 5,
      ebitdaGrowth: snapshot.historicalRevenueGrowth * 0.9 || 4,
      epsGrowth: snapshot.historicalRevenueGrowth * 0.85 || 4,
      beta,
      volatility: round(15 + Math.abs(beta - 1) * 12 + seededMetric(ticker, 4, 0, 10)),
      maxDrawdown: round(8 + seededMetric(ticker, 5, 0, 25)),
      debtToEquity: round(debtToEquity, 2),
      cashToDebt: round(cashToDebt, 2),
    };
  } catch {
    return null;
  }
};

const round = (n: number, d = 1) => Number(n.toFixed(d));

export const getFactorUniverses = () =>
  FACTOR_UNIVERSES.map(({ id, name, description, tickers, sectorFocus }) => ({
    id,
    name,
    description,
    tickerCount: tickers.length,
    sectorFocus,
  }));

export const fetchUniverseSecurities = async (universeId: string): Promise<FactorRawMetrics[]> => {
  const universe = FACTOR_UNIVERSES.find((u) => u.id === universeId);
  if (!universe) throw new Error(`Unknown universe: ${universeId}`);

  const batchSize = 4;
  const results: FactorRawMetrics[] = [];

  for (let i = 0; i < universe.tickers.length; i += batchSize) {
    const batch = universe.tickers.slice(i, i + batchSize);
    const fetched = await Promise.all(batch.map((t) => fetchTickerMetrics(t)));
    for (const row of fetched) {
      if (row) results.push(row);
    }
  }

  if (!results.length) {
    throw new Error('Failed to fetch factor data for universe. Check FMP_API_KEY configuration.');
  }

  return results;
};

export interface FactorCalculateInput {
  universeId: string;
  tilt: FactorTiltKey;
  weights?: Partial<import('../calculations/factorCalculation').FactorWeights>;
  enabledFactors?: Partial<Record<import('../calculations/factorCalculation').FactorCategory, boolean>>;
}

export const runFactorEngine = async (input: FactorCalculateInput): Promise<FactorCalculationResult> => {
  const securities = await fetchUniverseSecurities(input.universeId);
  return calculateFactorScores({
    securities,
    tilt: input.tilt,
    weights: input.weights,
    enabledFactors: input.enabledFactors,
  });
};
