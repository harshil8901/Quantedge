import { defaultEVAAssumptions, EVACompanyData } from '../calculations/evaCalculation';
import { fetchAlphaVantageSnapshot } from './alphaVantageService';
import { fetchFmpCompanySnapshot } from './fmpService';

export interface EVAWorkspaceSnapshot {
  company: EVACompanyData;
  suggestedAssumptions: ReturnType<typeof defaultEVAAssumptions>;
  provider: 'fmp' | 'alpha_vantage';
}

const buildCompany = (snapshot: {
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
  historicalRevenueGrowth: number;
  historicalEbitdaMargin: number;
  historicalEbitMargin: number;
}): EVACompanyData => {
  const equity = snapshot.marketCap;
  const investedCapital = snapshot.debt + equity - snapshot.cash;
  const nopat = snapshot.ebit > 0 ? snapshot.ebit * (1 - Math.min(0.35, Math.max(0.1, 1 - snapshot.netIncome / snapshot.ebit))) : snapshot.netIncome;
  const roic = investedCapital > 0 ? (nopat / investedCapital) * 100 : 0;

  return {
    ticker: snapshot.ticker,
    companyName: snapshot.companyName,
    stockPrice: snapshot.currentPrice,
    marketCap: snapshot.marketCap,
    enterpriseValue: snapshot.marketCap + snapshot.debt - snapshot.cash,
    revenue: snapshot.revenue,
    ebitda: snapshot.ebitda,
    ebit: snapshot.ebit,
    netIncome: snapshot.netIncome,
    debt: snapshot.debt,
    equity,
    cash: snapshot.cash,
    investedCapital: Math.max(investedCapital, snapshot.debt + equity * 0.5),
    roic: Number(roic.toFixed(2)),
    revenueGrowth: snapshot.historicalRevenueGrowth,
    ebitdaMargin: snapshot.historicalEbitdaMargin,
  };
};

export const fetchEVAWorkspace = async (ticker: string): Promise<EVAWorkspaceSnapshot> => {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) throw new Error('Ticker is required.');

  const errors: string[] = [];

  try {
    const snapshot = await fetchFmpCompanySnapshot(normalized);
    const company = buildCompany(snapshot);
    return {
      company,
      suggestedAssumptions: defaultEVAAssumptions(company),
      provider: 'fmp',
    };
  } catch (fmpError) {
    errors.push(fmpError instanceof Error ? fmpError.message : 'FMP fetch failed.');
  }

  if (process.env.ALPHA_VANTAGE_API_KEY?.trim()) {
    try {
      const snapshot = await fetchAlphaVantageSnapshot(normalized);
      const company = buildCompany({
        ...snapshot,
        historicalEbitMargin: snapshot.historicalEbitMargin,
      });
      return {
        company,
        suggestedAssumptions: defaultEVAAssumptions(company),
        provider: 'alpha_vantage',
      };
    } catch (alphaError) {
      errors.push(alphaError instanceof Error ? alphaError.message : 'Alpha Vantage fetch failed.');
    }
  }

  throw new Error(
    errors.length
      ? `Unable to fetch EVA workspace. ${errors.join(' ')}`
      : 'Unable to fetch EVA workspace. Configure FMP_API_KEY or ALPHA_VANTAGE_API_KEY.',
  );
};
