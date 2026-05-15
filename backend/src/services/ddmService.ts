import axios from 'axios';
import {
  DDMCompanyInputs,
  DDMHistoricalPoint,
  DDMScenarioAssumptions,
  DDMScenarioKey,
} from '../calculations/ddmCalculation';
import { fetchFmpCompanySnapshot, isRapidApiKey } from './fmpService';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const RAPID_BASE_URL = 'https://financial-modeling-prep.p.rapidapi.com/v3';

const getApiKey = () => {
  const apiKey = process.env.FMP_API_KEY || process.env.FINANCIAL_MODELING_PREP_API_KEY;
  if (!apiKey) throw new Error('FMP_API_KEY (or FINANCIAL_MODELING_PREP_API_KEY) is not configured.');
  return apiKey;
};

const rapidHeaders = (apiKey: string) => ({
  'x-rapidapi-key': apiKey,
  'x-rapidapi-host': 'financial-modeling-prep.p.rapidapi.com',
});

const toNumber = (value: unknown): number => (typeof value === 'number' ? value : Number(value ?? 0)) || 0;

const fmpGet = async <T>(path: string, params: Record<string, string | number> = {}): Promise<T> => {
  const apiKey = getApiKey();
  const symbolPath = path;

  if (isRapidApiKey(apiKey)) {
    const response = await axios.get(`${RAPID_BASE_URL}${symbolPath}`, {
      params,
      headers: rapidHeaders(apiKey),
      timeout: 15000,
    });
    return response.data as T;
  }

  const response = await axios.get(`${BASE_URL}${symbolPath}`, {
    params: { ...params, apikey: apiKey },
    timeout: 15000,
  });
  return response.data as T;
};

const defaultAssumptions = (): Record<DDMScenarioKey, DDMScenarioAssumptions> => ({
  bear: { dividendGrowth: 3, costOfEquity: 13, stableGrowth: 2, forecastYears: 5 },
  base: { dividendGrowth: 5, costOfEquity: 11, stableGrowth: 4, forecastYears: 5 },
  bull: { dividendGrowth: 7, costOfEquity: 10, stableGrowth: 5, forecastYears: 5 },
});

export interface DDMWorkspaceSnapshot {
  company: DDMCompanyInputs;
  historical: DDMHistoricalPoint[];
  suggestedAssumptions: Record<DDMScenarioKey, DDMScenarioAssumptions>;
  provider: 'fmp';
}

export const fetchDDMWorkspace = async (ticker: string): Promise<DDMWorkspaceSnapshot> => {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) throw new Error('Ticker is required.');

  const snapshot = await fetchFmpCompanySnapshot(normalized);
  const symbol = encodeURIComponent(normalized);

  const [dividendHistory, ratios, keyMetrics] = await Promise.all([
    fmpGet<Record<string, unknown> | Record<string, unknown>[]>(`/historical-price-full/stock_dividend/${symbol}`).catch(() => []),
    fmpGet<Record<string, unknown>[]>(`/ratios/${symbol}`, { limit: 10 }).catch(() => []),
    fmpGet<Record<string, unknown>[]>(`/key-metrics/${symbol}`, { limit: 10 }).catch(() => []),
  ]);

  const profileRow = await fmpGet<Record<string, unknown>[]>(`/profile/${symbol}`).catch(() => []);
  const profile = profileRow?.[0] ?? {};

  const annualDividends = new Map<number, number>();
  const historyObj = dividendHistory as { historical?: Record<string, unknown>[] };
  const rawDivs = Array.isArray(historyObj?.historical) ? historyObj.historical : dividendHistory;
  const divList = Array.isArray(rawDivs) ? rawDivs : [];

  for (const row of divList) {
    const date = String(row.date || row.paymentDate || '');
    const year = date ? new Date(date).getFullYear() : 0;
    const amount = toNumber(row.dividend || row.adjDividend || row.amount);
    if (year > 1990 && amount > 0) {
      annualDividends.set(year, (annualDividends.get(year) ?? 0) + amount);
    }
  }

  const sortedYears = [...annualDividends.entries()].sort((a, b) => a[0] - b[0]).slice(-8);
  const latestRatio = ratios?.[0] ?? {};
  const latestMetrics = keyMetrics?.[0] ?? {};

  const currentPrice = snapshot.currentPrice;
  const latestDividend =
    sortedYears.length > 0
      ? sortedYears[sortedYears.length - 1][1]
      : toNumber(latestRatio.dividendPerShare || profile.lastDiv);

  const historical: DDMHistoricalPoint[] = sortedYears.map(([year, dividend]) => {
    const payoutRatio = toNumber(latestRatio.payoutRatio) || null;
    const yieldPercent = currentPrice > 0 ? round2((dividend / currentPrice) * 100) : null;
    return {
      year,
      dividend: round2(dividend),
      payoutRatio: payoutRatio ? round2(payoutRatio * (payoutRatio > 1 ? 1 : 100)) : null,
      yieldPercent,
    };
  });

  const dividendYield =
    toNumber(latestRatio.dividendYield) ||
    (currentPrice > 0 && latestDividend > 0 ? (latestDividend / currentPrice) * 100 : 0);

  const payoutRatio =
    toNumber(latestRatio.payoutRatio) > 1
      ? toNumber(latestRatio.payoutRatio)
      : toNumber(latestRatio.payoutRatio) * 100;

  const company: DDMCompanyInputs = {
    ticker: snapshot.ticker,
    companyName: snapshot.companyName,
    currentPrice,
    marketCap: snapshot.marketCap,
    beta: toNumber(profile.beta) || 1,
    dividendPerShare: latestDividend,
    dividendYield: round2(dividendYield > 1 ? dividendYield : dividendYield * 100),
    payoutRatio: round2(payoutRatio),
    eps: toNumber(snapshot.netIncome) / Math.max(snapshot.sharesOutstanding, 1) || toNumber(latestRatio.netIncomePerShare),
    netIncome: snapshot.netIncome,
    sharesOutstanding: snapshot.sharesOutstanding,
  };

  return {
    company,
    historical,
    suggestedAssumptions: defaultAssumptions(),
    provider: 'fmp',
  };
};

const round2 = (n: number) => Number(n.toFixed(2));
