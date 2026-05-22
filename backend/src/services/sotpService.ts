import {
  defaultSOTPAssumptions,
  SOTPCompanyData,
  SOTPSegment,
  SOTPValuationMethod,
} from '../calculations/sotpCalculation';
import { fetchAlphaVantageSnapshot } from './alphaVantageService';
import { fetchFmpCompanySnapshot } from './fmpService';

export interface SOTPWorkspaceSnapshot {
  company: SOTPCompanyData;
  suggestedSegments: SOTPSegment[];
  suggestedAssumptions: ReturnType<typeof defaultSOTPAssumptions>;
  provider: 'fmp' | 'alpha_vantage';
}

type SegmentTemplate = {
  names: string[];
  revenueWeights: number[];
  ebitdaMarginOffsets: number[];
  multiples: number[];
  methods: SOTPValuationMethod[];
  growthOffsets: number[];
};

const TICKER_TEMPLATES: Record<string, SegmentTemplate> = {
  GOOGL: {
    names: ['Google Services', 'Google Cloud', 'Other Bets'],
    revenueWeights: [0.78, 0.18, 0.04],
    ebitdaMarginOffsets: [0.12, -0.08, -0.2],
    multiples: [14, 18, 8],
    methods: ['evEbitda', 'evEbitda', 'evRevenue'],
    growthOffsets: [2, 6, -2],
  },
  GOOG: {
    names: ['Google Services', 'Google Cloud', 'Other Bets'],
    revenueWeights: [0.78, 0.18, 0.04],
    ebitdaMarginOffsets: [0.12, -0.08, -0.2],
    multiples: [14, 18, 8],
    methods: ['evEbitda', 'evEbitda', 'evRevenue'],
    growthOffsets: [2, 6, -2],
  },
  BRK: {
    names: ['Insurance & Float', 'Railroad & Utilities', 'Manufacturing & Retail', 'Equity Portfolio'],
    revenueWeights: [0.22, 0.28, 0.32, 0.18],
    ebitdaMarginOffsets: [0.25, 0.05, 0.02, 0.35],
    multiples: [12, 11, 9, 1],
    methods: ['evEbitda', 'evEbitda', 'evEbitda', 'marketValue'],
    growthOffsets: [1, 2, 3, 0],
  },
  RELIANCE: {
    names: ['O2C & Energy', 'Retail & Consumer', 'Digital Services', 'New Energy'],
    revenueWeights: [0.55, 0.22, 0.18, 0.05],
    ebitdaMarginOffsets: [0.04, -0.02, 0.1, -0.1],
    multiples: [7, 16, 22, 12],
    methods: ['evEbitda', 'evRevenue', 'evEbitda', 'evEbitda'],
    growthOffsets: [0, 5, 8, 12],
  },
};

const DEFAULT_TEMPLATE: SegmentTemplate = {
  names: ['Core Operations', 'Growth Platforms', 'Corporate & Other'],
  revenueWeights: [0.62, 0.28, 0.1],
  ebitdaMarginOffsets: [0.05, -0.05, -0.15],
  multiples: [10, 14, 6],
  methods: ['evEbitda', 'evEbitda', 'evRevenue'],
  growthOffsets: [0, 4, -1],
};

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
}): SOTPCompanyData => ({
  ticker: snapshot.ticker,
  companyName: snapshot.companyName,
  stockPrice: snapshot.currentPrice,
  marketCap: snapshot.marketCap,
  enterpriseValue: snapshot.marketCap + snapshot.debt - snapshot.cash,
  revenue: snapshot.revenue,
  ebitda: snapshot.ebitda,
  netIncome: snapshot.netIncome,
  cash: snapshot.cash,
  debt: snapshot.debt,
  sharesOutstanding: snapshot.sharesOutstanding,
  revenueGrowth: snapshot.historicalRevenueGrowth,
  ebitdaMargin: snapshot.historicalEbitdaMargin,
});

const buildSuggestedSegments = (company: SOTPCompanyData): SOTPSegment[] => {
  const template = TICKER_TEMPLATES[company.ticker] ?? DEFAULT_TEMPLATE;
  const baseMargin = company.revenue > 0 ? (company.ebitda / company.revenue) * 100 : 20;

  return template.names.map((name, index) => {
    const revenue = company.revenue * template.revenueWeights[index];
    const margin = Math.max(5, baseMargin + template.ebitdaMarginOffsets[index] * 100);
    const ebitda = revenue * (margin / 100);
    const growth = Math.max(0, company.revenueGrowth + template.growthOffsets[index]);

    return {
      id: `seg-${index + 1}`,
      name,
      revenue: Math.round(revenue),
      ebitda: Math.round(ebitda),
      growth: Math.round(growth * 10) / 10,
      multiple: template.multiples[index],
      valuationMethod: template.methods[index],
      revenueShare: Math.round(template.revenueWeights[index] * 1000) / 10,
      dcfValue: template.methods[index] === 'dcf' ? Math.round(ebitda * template.multiples[index] * 1.1) : undefined,
      marketValue:
        template.methods[index] === 'marketValue' ? Math.round(company.marketCap * template.revenueWeights[index]) : undefined,
    };
  });
};

export const fetchSOTPWorkspace = async (ticker: string): Promise<SOTPWorkspaceSnapshot> => {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) throw new Error('Ticker is required.');

  const errors: string[] = [];

  try {
    const snapshot = await fetchFmpCompanySnapshot(normalized);
    const company = buildCompany(snapshot);
    return {
      company,
      suggestedSegments: buildSuggestedSegments(company),
      suggestedAssumptions: defaultSOTPAssumptions(),
      provider: 'fmp',
    };
  } catch (fmpError) {
    errors.push(fmpError instanceof Error ? fmpError.message : 'FMP fetch failed.');
  }

  if (process.env.ALPHA_VANTAGE_API_KEY?.trim()) {
    try {
      const snapshot = await fetchAlphaVantageSnapshot(normalized);
      const company = buildCompany(snapshot);
      return {
        company,
        suggestedSegments: buildSuggestedSegments(company),
        suggestedAssumptions: defaultSOTPAssumptions(),
        provider: 'alpha_vantage',
      };
    } catch (alphaError) {
      errors.push(alphaError instanceof Error ? alphaError.message : 'Alpha Vantage fetch failed.');
    }
  }

  throw new Error(
    errors.length
      ? `Unable to fetch SOTP workspace. ${errors.join(' ')}`
      : 'Unable to fetch SOTP workspace. Configure FMP_API_KEY or ALPHA_VANTAGE_API_KEY.',
  );
};
