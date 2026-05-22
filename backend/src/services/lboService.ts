import { defaultLBOAssumptions, defaultScenarioOverrides, LBOAssumptions, LBOCompanyData } from '../calculations/lboCalculation';
import { fetchAlphaVantageSnapshot } from './alphaVantageService';
import { fetchFmpCompanySnapshot } from './fmpService';

export interface LBOWorkspaceSnapshot {
  company: LBOCompanyData;
  suggestedAssumptions: LBOAssumptions;
  suggestedScenarioOverrides: ReturnType<typeof defaultScenarioOverrides>;
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
  netIncome: number;
  cash: number;
  debt: number;
  historicalRevenueGrowth: number;
  historicalEbitdaMargin: number;
}): LBOCompanyData => {
  const enterpriseValue = snapshot.marketCap + snapshot.debt - snapshot.cash;
  return {
    ticker: snapshot.ticker,
    companyName: snapshot.companyName,
    stockPrice: snapshot.currentPrice,
    marketCap: snapshot.marketCap,
    enterpriseValue,
    revenue: snapshot.revenue,
    ebitda: snapshot.ebitda,
    netIncome: snapshot.netIncome,
    cash: snapshot.cash,
    debt: snapshot.debt,
    sharesOutstanding: snapshot.sharesOutstanding,
    ebitdaMargin: snapshot.historicalEbitdaMargin,
    revenueGrowth: snapshot.historicalRevenueGrowth,
  };
};

export const fetchLBOWorkspace = async (ticker: string): Promise<LBOWorkspaceSnapshot> => {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) throw new Error('Ticker is required.');

  const errors: string[] = [];

  try {
    const snapshot = await fetchFmpCompanySnapshot(normalized);
    const company = buildCompany(snapshot);
    const suggestedAssumptions = defaultLBOAssumptions(company);
    return {
      company,
      suggestedAssumptions,
      suggestedScenarioOverrides: defaultScenarioOverrides(suggestedAssumptions),
      provider: 'fmp',
    };
  } catch (fmpError) {
    errors.push(fmpError instanceof Error ? fmpError.message : 'FMP fetch failed.');
  }

  if (process.env.ALPHA_VANTAGE_API_KEY?.trim()) {
    try {
      const snapshot = await fetchAlphaVantageSnapshot(normalized);
      const company = buildCompany(snapshot);
      const suggestedAssumptions = defaultLBOAssumptions(company);
      return {
        company,
        suggestedAssumptions,
        suggestedScenarioOverrides: defaultScenarioOverrides(suggestedAssumptions),
        provider: 'alpha_vantage',
      };
    } catch (alphaError) {
      errors.push(alphaError instanceof Error ? alphaError.message : 'Alpha Vantage fetch failed.');
    }
  }

  throw new Error(
    errors.length
      ? `Unable to fetch LBO workspace. ${errors.join(' ')}`
      : 'Unable to fetch LBO workspace. Configure FMP_API_KEY or ALPHA_VANTAGE_API_KEY.',
  );
};
