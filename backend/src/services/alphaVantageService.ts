import axios from 'axios';

const BASE_URL = 'https://www.alphavantage.co/query';
const getApiKey = () => {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY is not configured.');
  }
  return apiKey;
};

const toNumber = (value: unknown): number => (typeof value === 'number' ? value : Number(value ?? 0)) || 0;
const latest = <T>(arr: T[] | undefined) => (Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined);
const previous = <T>(arr: T[] | undefined) => (Array.isArray(arr) && arr.length > 1 ? arr[1] : undefined);

const assertValidPayload = (payload: unknown, endpoint: string) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`Alpha Vantage ${endpoint} returned empty payload.`);
  }
  const body = payload as Record<string, unknown>;
  if (body.Note || body.Information || body['Error Message']) {
    throw new Error(`Alpha Vantage ${endpoint} request failed or rate-limited.`);
  }
};

export interface AlphaVantageSnapshot {
  ticker: string;
  companyName: string;
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
  source: 'alpha_vantage';
}

export const fetchAlphaVantageSnapshot = async (ticker: string): Promise<AlphaVantageSnapshot> => {
  const apiKey = getApiKey();
  const symbol = ticker.toUpperCase();

  const [quoteRes, overviewRes, incomeRes, balanceRes, cashflowRes] = await Promise.all([
    axios.get(`${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`),
    axios.get(`${BASE_URL}?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`),
    axios.get(`${BASE_URL}?function=INCOME_STATEMENT&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`),
    axios.get(`${BASE_URL}?function=BALANCE_SHEET&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`),
    axios.get(`${BASE_URL}?function=CASH_FLOW&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`),
  ]);

  assertValidPayload(quoteRes.data, 'GLOBAL_QUOTE');
  assertValidPayload(overviewRes.data, 'OVERVIEW');
  assertValidPayload(incomeRes.data, 'INCOME_STATEMENT');
  assertValidPayload(balanceRes.data, 'BALANCE_SHEET');
  assertValidPayload(cashflowRes.data, 'CASH_FLOW');

  const quote = (quoteRes.data?.['Global Quote'] ?? {}) as Record<string, unknown>;
  const overview = (overviewRes.data ?? {}) as Record<string, unknown>;
  const income = (latest(incomeRes.data?.quarterlyReports) ?? latest(incomeRes.data?.annualReports) ?? {}) as Record<string, unknown>;
  const prevIncome = (previous(incomeRes.data?.quarterlyReports) ?? previous(incomeRes.data?.annualReports) ?? {}) as Record<string, unknown>;
  const balance = (latest(balanceRes.data?.quarterlyReports) ?? latest(balanceRes.data?.annualReports) ?? {}) as Record<string, unknown>;
  const cashflow = (latest(cashflowRes.data?.quarterlyReports) ?? latest(cashflowRes.data?.annualReports) ?? {}) as Record<string, unknown>;

  const revenue = toNumber(income.totalRevenue);
  const ebitda = toNumber(income.ebitda);
  const ebit = toNumber(income.operatingIncome);
  const freeCashFlow = toNumber(cashflow.operatingCashflow) - Math.abs(toNumber(cashflow.capitalExpenditures));
  const prevRevenue = toNumber(prevIncome.totalRevenue);
  const currentAssets = toNumber(balance.totalCurrentAssets);
  const currentLiabilities = toNumber(balance.totalCurrentLiabilities);

  const currentPrice = toNumber(quote['05. price'] || overview['52WeekHigh'] || overview['50DayMovingAverage']);
  if (currentPrice <= 0) {
    throw new Error('Alpha Vantage quote returned invalid current price.');
  }

  return {
    ticker: String(overview.Symbol || symbol),
    companyName: String(overview.Name || symbol),
    currentPrice,
    marketCap: toNumber(overview.MarketCapitalization),
    sharesOutstanding: toNumber(overview.SharesOutstanding),
    revenue,
    ebitda,
    ebit,
    netIncome: toNumber(income.netIncome),
    cash: toNumber(balance.cashAndCashEquivalentsAtCarryingValue),
    debt: toNumber(balance.shortLongTermDebtTotal),
    workingCapital: currentAssets - currentLiabilities,
    freeCashFlow,
    capex: Math.abs(toNumber(cashflow.capitalExpenditures)),
    depreciationAndAmortization: toNumber(cashflow.depreciationDepletionAndAmortization),
    historicalRevenueGrowth: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0,
    historicalEbitdaMargin: revenue > 0 ? (ebitda / revenue) * 100 : 0,
    historicalEbitMargin: revenue > 0 ? (ebit / revenue) * 100 : 0,
    historicalFcfMargin: revenue > 0 ? (freeCashFlow / revenue) * 100 : 0,
    source: 'alpha_vantage',
  };
};
