import axios from 'axios';
import {
  RIMCompanyInputs,
  RIMHistoricalPoint,
  RIMScenarioAssumptions,
  RIMScenarioKey,
} from '../calculations/rimCalculation';
import { fetchAlphaVantageSnapshot } from './alphaVantageService';
import { fetchFmpCompanySnapshot, isRapidApiKey } from './fmpService';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const RAPID_BASE_URL = 'https://financial-modeling-prep.p.rapidapi.com/v3';
const ALPHA_BASE_URL = 'https://www.alphavantage.co/query';

const getFmpApiKey = () => {
  const apiKey = process.env.FMP_API_KEY || process.env.FINANCIAL_MODELING_PREP_API_KEY;
  if (!apiKey) throw new Error('FMP_API_KEY (or FINANCIAL_MODELING_PREP_API_KEY) is not configured.');
  return apiKey;
};

const getAlphaApiKey = () => process.env.ALPHA_VANTAGE_API_KEY?.trim() || '';

const rapidHeaders = (apiKey: string) => ({
  'x-rapidapi-key': apiKey,
  'x-rapidapi-host': 'financial-modeling-prep.p.rapidapi.com',
});

const toNumber = (value: unknown): number => (typeof value === 'number' ? value : Number(value ?? 0)) || 0;

const round2 = (n: number) => Number(n.toFixed(2));

const fmpGet = async <T>(path: string, params: Record<string, string | number> = {}): Promise<T> => {
  const apiKey = getFmpApiKey();

  if (isRapidApiKey(apiKey)) {
    const response = await axios.get(`${RAPID_BASE_URL}${path}`, {
      params,
      headers: rapidHeaders(apiKey),
      timeout: 15000,
    });
    return response.data as T;
  }

  const response = await axios.get(`${BASE_URL}${path}`, {
    params: { ...params, apikey: apiKey },
    timeout: 15000,
  });
  return response.data as T;
};

const defaultAssumptions = (): Record<RIMScenarioKey, RIMScenarioAssumptions> => ({
  bear: { futureROE: 12, costOfEquity: 13, growth: 3, forecastYears: 5 },
  base: { futureROE: 16, costOfEquity: 11, growth: 5, forecastYears: 5 },
  bull: { futureROE: 20, costOfEquity: 10, growth: 7, forecastYears: 5 },
});

export type RIMDataProvider = 'fmp' | 'alpha_vantage';

export interface RIMWorkspaceSnapshot {
  company: RIMCompanyInputs;
  historical: RIMHistoricalPoint[];
  suggestedAssumptions: Record<RIMScenarioKey, RIMScenarioAssumptions>;
  provider: RIMDataProvider;
  fallbackUsed?: boolean;
}

const extractYear = (row: Record<string, unknown>): number => {
  const calendarYear = toNumber(row.calendarYear);
  if (calendarYear > 1990) return calendarYear;
  const date = String(row.date || row.fillingDate || row.fiscalDateEnding || '');
  return date ? new Date(date).getFullYear() : 0;
};

const buildHistorical = (
  incomeByYear: Map<number, Record<string, unknown>>,
  balanceByYear: Map<number, Record<string, unknown>>,
  shares: number,
): RIMHistoricalPoint[] => {
  const years = [...new Set([...balanceByYear.keys(), ...incomeByYear.keys()])].sort((a, b) => a - b).slice(-8);

  return years.map((year) => {
    const income = incomeByYear.get(year) ?? {};
    const balance = balanceByYear.get(year) ?? {};
    const netIncome = toNumber(income.netIncome);
    const bookValue = toNumber(
      balance.totalStockholdersEquity || balance.totalEquity || balance.totalShareholderEquity,
    );
    const bvps = shares > 0 && bookValue > 0 ? bookValue / shares : 0;
    const roe = bookValue > 0 ? (netIncome / bookValue) * 100 : 0;
    const prevIncome = incomeByYear.get(year - 1);
    const prevRevenue = prevIncome ? toNumber(prevIncome.revenue || prevIncome.totalRevenue) : 0;
    const revenue = toNumber(income.revenue || income.totalRevenue);
    const revenueGrowth =
      prevRevenue > 0 && revenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;

    return {
      year,
      roe: round2(roe),
      netIncome: round2(netIncome),
      bookValue: round2(bookValue),
      bookValuePerShare: round2(bvps),
      retainedEarnings: round2(toNumber(balance.retainedEarnings)),
      revenueGrowth: revenueGrowth != null ? round2(revenueGrowth) : null,
    };
  });
};

type EquitySnapshot = {
  ticker: string;
  companyName: string;
  currentPrice: number;
  marketCap: number;
  sharesOutstanding: number;
  netIncome: number;
  historicalRevenueGrowth: number;
};

const buildCompanyFromSnapshot = (
  snapshot: EquitySnapshot,
  extras: {
    beta?: number;
    shareholderEquity: number;
    bookValuePerShare: number;
    retainedEarnings: number;
    roe: number;
    eps: number;
  },
): RIMCompanyInputs => ({
  ticker: snapshot.ticker,
  companyName: snapshot.companyName,
  currentPrice: snapshot.currentPrice,
  marketCap: snapshot.marketCap,
  beta: extras.beta ?? 1,
  sharesOutstanding: snapshot.sharesOutstanding,
  shareholderEquity: round2(extras.shareholderEquity),
  bookValuePerShare: round2(extras.bookValuePerShare),
  retainedEarnings: round2(extras.retainedEarnings),
  netIncome: round2(snapshot.netIncome),
  eps: round2(extras.eps),
  roe: round2(extras.roe),
  revenueGrowth: round2(snapshot.historicalRevenueGrowth),
});

const fetchRIMWorkspaceFromFmp = async (normalized: string): Promise<RIMWorkspaceSnapshot> => {
  const snapshot = await fetchFmpCompanySnapshot(normalized);
  const symbol = encodeURIComponent(normalized);

  const [incomeRows, balanceRows, profileRow, keyMetrics] = await Promise.all([
    fmpGet<Record<string, unknown>[]>(`/income-statement/${symbol}`, { limit: 10 }).catch(() => []),
    fmpGet<Record<string, unknown>[]>(`/balance-sheet-statement/${symbol}`, { limit: 10 }).catch(() => []),
    fmpGet<Record<string, unknown>[]>(`/profile/${symbol}`).catch(() => []),
    fmpGet<Record<string, unknown>[]>(`/key-metrics/${symbol}`, { limit: 10 }).catch(() => []),
  ]);

  const profile = profileRow?.[0] ?? {};
  const latestIncome = incomeRows?.[0] ?? {};
  const latestBalance = balanceRows?.[0] ?? {};
  const latestMetrics = keyMetrics?.[0] ?? {};

  const shares = snapshot.sharesOutstanding;
  const shareholderEquity = toNumber(
    latestBalance.totalStockholdersEquity ||
      latestBalance.totalEquity ||
      toNumber(latestMetrics.bookValuePerShare) * shares,
  );
  const retainedEarnings = toNumber(latestBalance.retainedEarnings);
  const bookValuePerShare =
    shares > 0 && shareholderEquity > 0
      ? shareholderEquity / shares
      : toNumber(latestMetrics.bookValuePerShare);

  const rawRoe = toNumber(latestMetrics.roe);
  const currentRoe =
    rawRoe > 1 ? rawRoe : rawRoe * 100 || (shareholderEquity > 0 ? (snapshot.netIncome / shareholderEquity) * 100 : 0);

  const eps =
    shares > 0 ? snapshot.netIncome / shares : toNumber(latestIncome.eps || latestIncome.epsdiluted);

  const balanceByYear = new Map<number, Record<string, unknown>>();
  for (const row of balanceRows ?? []) {
    const year = extractYear(row);
    if (year > 1990) balanceByYear.set(year, row);
  }

  const incomeByYear = new Map<number, Record<string, unknown>>();
  for (const row of incomeRows ?? []) {
    const year = extractYear(row);
    if (year > 1990) incomeByYear.set(year, row);
  }

  return {
    company: buildCompanyFromSnapshot(snapshot, {
      beta: toNumber(profile.beta) || 1,
      shareholderEquity,
      bookValuePerShare,
      retainedEarnings,
      roe: currentRoe,
      eps,
    }),
    historical: buildHistorical(incomeByYear, balanceByYear, shares),
    suggestedAssumptions: defaultAssumptions(),
    provider: 'fmp',
  };
};

const assertAlphaPayload = (payload: unknown, endpoint: string) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`Alpha Vantage ${endpoint} returned empty payload.`);
  }
  const body = payload as Record<string, unknown>;
  if (body.Note || body.Information || body['Error Message']) {
    throw new Error(`Alpha Vantage ${endpoint} request failed or rate-limited.`);
  }
};

const fetchRIMWorkspaceFromAlphaVantage = async (normalized: string): Promise<RIMWorkspaceSnapshot> => {
  const apiKey = getAlphaApiKey();
  if (!apiKey) throw new Error('ALPHA_VANTAGE_API_KEY is not configured.');

  const symbol = encodeURIComponent(normalized);
  const [overviewRes, incomeRes, balanceRes] = await Promise.all([
    axios.get(`${ALPHA_BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`, { timeout: 20000 }),
    axios.get(`${ALPHA_BASE_URL}?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${apiKey}`, { timeout: 20000 }),
    axios.get(`${ALPHA_BASE_URL}?function=BALANCE_SHEET&symbol=${symbol}&apikey=${apiKey}`, { timeout: 20000 }),
  ]);

  assertAlphaPayload(overviewRes.data, 'OVERVIEW');
  assertAlphaPayload(incomeRes.data, 'INCOME_STATEMENT');
  assertAlphaPayload(balanceRes.data, 'BALANCE_SHEET');

  const overview = (overviewRes.data ?? {}) as Record<string, unknown>;
  const incomeAnnual = Array.isArray(incomeRes.data?.annualReports)
    ? (incomeRes.data.annualReports as Record<string, unknown>[])
    : [];
  const balanceAnnual = Array.isArray(balanceRes.data?.annualReports)
    ? (balanceRes.data.annualReports as Record<string, unknown>[])
    : [];

  const snapshot = await fetchAlphaVantageSnapshot(normalized);
  const shares = snapshot.sharesOutstanding;

  const incomeByYear = new Map<number, Record<string, unknown>>();
  for (const row of incomeAnnual) {
    const year = extractYear(row);
    if (year > 1990) incomeByYear.set(year, row);
  }

  const balanceByYear = new Map<number, Record<string, unknown>>();
  for (const row of balanceAnnual) {
    const year = extractYear(row);
    if (year > 1990) balanceByYear.set(year, row);
  }

  const latestBalance = balanceAnnual[0] ?? {};
  const shareholderEquity = toNumber(
    latestBalance.totalShareholderEquity || latestBalance.totalShareholdersEquity,
  );
  const retainedEarnings = toNumber(latestBalance.retainedEarnings);
  const bookValuePerShare = toNumber(overview.BookValue) || (shares > 0 && shareholderEquity > 0 ? shareholderEquity / shares : 0);
  const overviewRoe = toNumber(overview.ReturnOnEquityTTM);
  const roe =
    overviewRoe > 1
      ? overviewRoe
      : overviewRoe * 100 || (shareholderEquity > 0 ? (snapshot.netIncome / shareholderEquity) * 100 : 0);
  const eps = shares > 0 ? snapshot.netIncome / shares : toNumber(overview.EPS);

  return {
    company: buildCompanyFromSnapshot(snapshot, {
      beta: toNumber(overview.Beta) || 1,
      shareholderEquity,
      bookValuePerShare,
      retainedEarnings,
      roe,
      eps,
    }),
    historical: buildHistorical(incomeByYear, balanceByYear, shares),
    suggestedAssumptions: defaultAssumptions(),
    provider: 'alpha_vantage',
  };
};

export const fetchRIMWorkspace = async (ticker: string): Promise<RIMWorkspaceSnapshot> => {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) throw new Error('Ticker is required.');

  const errors: string[] = [];

  try {
    return await fetchRIMWorkspaceFromFmp(normalized);
  } catch (fmpError) {
    errors.push(fmpError instanceof Error ? fmpError.message : 'FMP fetch failed.');
  }

  if (getAlphaApiKey()) {
    try {
      const workspace = await fetchRIMWorkspaceFromAlphaVantage(normalized);
      return { ...workspace, fallbackUsed: true };
    } catch (alphaError) {
      errors.push(alphaError instanceof Error ? alphaError.message : 'Alpha Vantage fetch failed.');
    }
  }

  throw new Error(
    errors.length
      ? `Unable to fetch residual income workspace. ${errors.join(' ')}`
      : 'Unable to fetch residual income workspace. Configure FMP_API_KEY or ALPHA_VANTAGE_API_KEY in backend/.env.',
  );
};
