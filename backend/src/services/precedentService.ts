import {
  PrecedentDealType,
  PrecedentTargetCompany,
  PrecedentTransaction,
} from '../calculations/precedentCalculation';
import axios from 'axios';
import { fetchFmpCompanySnapshot, isRapidApiKey } from './fmpService';
import { fetchAlphaVantageSnapshot } from './alphaVantageService';

const FMP_BASE = 'https://financialmodelingprep.com/api/v3';
const FMP_RAPID = 'https://financial-modeling-prep.p.rapidapi.com/v3';

const fetchProfileSector = async (ticker: string): Promise<{ sector: string; industry: string }> => {
  const apiKey = process.env.FMP_API_KEY || process.env.FINANCIAL_MODELING_PREP_API_KEY;
  if (!apiKey) return { sector: 'Technology', industry: 'Technology' };

  const symbol = encodeURIComponent(ticker);
  try {
    const response = isRapidApiKey(apiKey)
      ? await axios.get(`${FMP_RAPID}/profile/${symbol}`, {
          headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'financial-modeling-prep.p.rapidapi.com' },
          timeout: 12000,
        })
      : await axios.get(`${FMP_BASE}/profile/${symbol}?apikey=${apiKey}`, { timeout: 12000 });

    const profile = response.data?.[0] ?? {};
    const sector = mapSector(String(profile.sector || profile.industry || 'Technology'));
    return { sector, industry: String(profile.industry || sector) };
  } catch {
    return { sector: 'Technology', industry: 'Technology' };
  }
};

const MOCK_TRANSACTIONS: PrecedentTransaction[] = [
  {
    id: 'txn-001',
    acquirer: 'Microsoft Corp.',
    target: 'Activision Blizzard',
    dealDate: '2023-10-13',
    dealYear: 2023,
    dealValue: 68700000000,
    evEbitda: 22.4,
    evRevenue: 8.1,
    premiumPaid: 45.2,
    sector: 'Technology',
    dealType: 'Strategic',
    targetRevenue: 7506000000,
    targetEbitda: 3067000000,
  },
  {
    id: 'txn-002',
    acquirer: 'Broadcom Inc.',
    target: 'VMware Inc.',
    dealDate: '2023-11-22',
    dealYear: 2023,
    dealValue: 69000000000,
    evEbitda: 18.6,
    evRevenue: 6.4,
    premiumPaid: 32.8,
    sector: 'Technology',
    dealType: 'Strategic',
    targetRevenue: 10780000000,
    targetEbitda: 3704000000,
  },
  {
    id: 'txn-003',
    acquirer: 'Adobe Inc.',
    target: 'Figma Inc.',
    dealDate: '2022-09-15',
    dealYear: 2022,
    dealValue: 20000000000,
    evEbitda: 0,
    evRevenue: 50.0,
    premiumPaid: 38.5,
    sector: 'Technology',
    dealType: 'Strategic',
    targetRevenue: 400000000,
    targetEbitda: 0,
  },
  {
    id: 'txn-004',
    acquirer: 'Thoma Bravo',
    target: 'Anaplan Inc.',
    dealDate: '2022-06-21',
    dealYear: 2022,
    dealValue: 10700000000,
    evEbitda: 14.2,
    evRevenue: 12.8,
    premiumPaid: 28.4,
    sector: 'Technology',
    dealType: 'Financial Sponsor',
    targetRevenue: 836000000,
    targetEbitda: 753000000,
  },
  {
    id: 'txn-005',
    acquirer: 'Vista Equity Partners',
    target: 'Zendesk Inc.',
    dealDate: '2022-11-28',
    dealYear: 2022,
    dealValue: 10200000000,
    evEbitda: 16.8,
    evRevenue: 5.2,
    premiumPaid: 34.1,
    sector: 'Technology',
    dealType: 'Take-Private',
    targetRevenue: 1960000000,
    targetEbitda: 607000000,
  },
  {
    id: 'txn-006',
    acquirer: 'Salesforce Inc.',
    target: 'Slack Technologies',
    dealDate: '2021-07-21',
    dealYear: 2021,
    dealValue: 27700000000,
    evEbitda: 0,
    evRevenue: 24.6,
    premiumPaid: 54.8,
    sector: 'Technology',
    dealType: 'Strategic',
    targetRevenue: 1126000000,
    targetEbitda: 0,
  },
  {
    id: 'txn-007',
    acquirer: 'NVIDIA Corp.',
    target: 'Mellanox Technologies',
    dealDate: '2020-04-27',
    dealYear: 2020,
    dealValue: 6900000000,
    evEbitda: 19.2,
    evRevenue: 8.9,
    premiumPaid: 18.2,
    sector: 'Technology',
    dealType: 'Strategic',
    targetRevenue: 776000000,
    targetEbitda: 359000000,
  },
  {
    id: 'txn-008',
    acquirer: 'KKR & Co.',
    target: 'BMC Software',
    dealDate: '2018-05-29',
    dealYear: 2018,
    dealValue: 8500000000,
    evEbitda: 12.4,
    evRevenue: 4.8,
    premiumPaid: 22.6,
    sector: 'Technology',
    dealType: 'Financial Sponsor',
    targetRevenue: 1770000000,
    targetEbitda: 685000000,
  },
  {
    id: 'txn-009',
    acquirer: 'Oracle Corp.',
    target: 'Cerner Corp.',
    dealDate: '2022-06-08',
    dealYear: 2022,
    dealValue: 28300000000,
    evEbitda: 17.1,
    evRevenue: 4.2,
    premiumPaid: 26.3,
    sector: 'Healthcare',
    dealType: 'Strategic',
    targetRevenue: 6730000000,
    targetEbitda: 1655000000,
  },
  {
    id: 'txn-010',
    acquirer: 'UnitedHealth Group',
    target: 'Change Healthcare',
    dealDate: '2022-03-29',
    dealYear: 2022,
    dealValue: 13100000000,
    evEbitda: 15.8,
    evRevenue: 3.6,
    premiumPaid: 41.2,
    sector: 'Healthcare',
    dealType: 'Strategic',
    targetRevenue: 3636000000,
    targetEbitda: 829000000,
  },
  {
    id: 'txn-011',
    acquirer: 'Bristol-Myers Squibb',
    target: 'Karuna Therapeutics',
    dealDate: '2023-12-22',
    dealYear: 2023,
    dealValue: 14000000000,
    evEbitda: 0,
    evRevenue: 0,
    premiumPaid: 52.4,
    sector: 'Healthcare',
    dealType: 'Strategic',
    targetRevenue: 0,
    targetEbitda: 0,
  },
  {
    id: 'txn-012',
    acquirer: 'Apollo Global',
    target: 'Airbnb (stake build)',
    dealDate: '2021-03-15',
    dealYear: 2021,
    dealValue: 4200000000,
    evEbitda: 28.5,
    evRevenue: 9.8,
    premiumPaid: 31.5,
    sector: 'Consumer',
    dealType: 'Financial Sponsor',
    targetRevenue: 428000000,
    targetEbitda: 147000000,
  },
  {
    id: 'txn-013',
    acquirer: 'Disney',
    target: 'Hulu (remaining stake)',
    dealDate: '2023-11-01',
    dealYear: 2023,
    dealValue: 8600000000,
    evEbitda: 21.3,
    evRevenue: 3.1,
    premiumPaid: 29.7,
    sector: 'Consumer',
    dealType: 'Strategic',
    targetRevenue: 2774000000,
    targetEbitda: 403000000,
  },
  {
    id: 'txn-014',
    acquirer: 'Exxon Mobil',
    target: 'Pioneer Natural Resources',
    dealDate: '2023-10-11',
    dealYear: 2023,
    dealValue: 59500000000,
    evEbitda: 8.4,
    evRevenue: 4.6,
    premiumPaid: 18.9,
    sector: 'Energy',
    dealType: 'Strategic',
    targetRevenue: 12930000000,
    targetEbitda: 7083000000,
  },
  {
    id: 'txn-015',
    acquirer: 'Chevron Corp.',
    target: 'Hess Corp.',
    dealDate: '2023-10-23',
    dealYear: 2023,
    dealValue: 53000000000,
    evEbitda: 7.9,
    evRevenue: 3.8,
    premiumPaid: 10.4,
    sector: 'Energy',
    dealType: 'Merger of Equals',
    targetRevenue: 13940000000,
    targetEbitda: 6709000000,
  },
  {
    id: 'txn-016',
    acquirer: 'Blackstone Inc.',
    target: 'Ancestry.com',
    dealDate: '2020-12-04',
    dealYear: 2020,
    dealValue: 4700000000,
    evEbitda: 13.6,
    evRevenue: 5.4,
    premiumPaid: 24.8,
    sector: 'Consumer',
    dealType: 'Financial Sponsor',
    targetRevenue: 870000000,
    targetEbitda: 345000000,
  },
  {
    id: 'txn-017',
    acquirer: 'IBM Corp.',
    target: 'Red Hat Inc.',
    dealDate: '2019-07-09',
    dealYear: 2019,
    dealValue: 34000000000,
    evEbitda: 24.8,
    evRevenue: 8.2,
    premiumPaid: 63.1,
    sector: 'Technology',
    dealType: 'Strategic',
    targetRevenue: 4148000000,
    targetEbitda: 1371000000,
  },
  {
    id: 'txn-018',
    acquirer: 'Silver Lake',
    target: 'Qualtrics (take-private)',
    dealDate: '2023-06-26',
    dealYear: 2023,
    dealValue: 12500000000,
    evEbitda: 11.2,
    evRevenue: 6.1,
    premiumPaid: 36.2,
    sector: 'Technology',
    dealType: 'Take-Private',
    targetRevenue: 2049000000,
    targetEbitda: 1116000000,
  },
];

const SECTOR_ALIASES: Record<string, string[]> = {
  Technology: ['technology', 'software', 'semiconductor', 'internet', 'communication'],
  Healthcare: ['healthcare', 'health', 'biotech', 'pharma', 'medical'],
  Consumer: ['consumer', 'retail', 'discretionary', 'staples', 'leisure'],
  Energy: ['energy', 'oil', 'gas', 'utilities'],
  Financial: ['financial', 'bank', 'insurance', 'capital markets'],
};

const mapSector = (raw: string): string => {
  const lower = raw.toLowerCase();
  for (const [sector, aliases] of Object.entries(SECTOR_ALIASES)) {
    if (aliases.some((alias) => lower.includes(alias))) return sector;
  }
  return 'Technology';
};

const selectTransactions = (sector: string, industry: string): PrecedentTransaction[] => {
  const primary = MOCK_TRANSACTIONS.filter((t) => t.sector === sector);
  if (primary.length >= 8) return primary;

  const blended = [
    ...primary,
    ...MOCK_TRANSACTIONS.filter((t) => t.sector !== sector).slice(0, 12 - primary.length),
  ];
  return blended.slice(0, 14);
};

export interface PrecedentWorkspaceSnapshot {
  target: PrecedentTargetCompany;
  transactions: PrecedentTransaction[];
  availableSectors: string[];
  availableDealTypes: PrecedentDealType[];
  provider: 'fmp' | 'alpha_vantage';
  dataSource: 'mock_transactions';
}

const buildTargetFromSnapshot = (
  snapshot: {
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
  },
  sector: string,
  industry: string,
): PrecedentTargetCompany => {
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
    sector,
    industry,
  };
};

const fetchTargetCompany = async (ticker: string) => {
  try {
    const [snapshot, meta] = await Promise.all([fetchFmpCompanySnapshot(ticker), fetchProfileSector(ticker)]);
    return {
      target: buildTargetFromSnapshot(snapshot, meta.sector, meta.industry),
      provider: 'fmp' as const,
    };
  } catch (fmpError) {
    if (process.env.ALPHA_VANTAGE_API_KEY?.trim()) {
      const snapshot = await fetchAlphaVantageSnapshot(ticker);
      const sector = mapSector(snapshot.companyName);
      return {
        target: buildTargetFromSnapshot(snapshot, sector, sector),
        provider: 'alpha_vantage' as const,
      };
    }
    throw fmpError;
  }
};

export const fetchPrecedentWorkspace = async (ticker: string): Promise<PrecedentWorkspaceSnapshot> => {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) throw new Error('Ticker is required.');

  const { target, provider } = await fetchTargetCompany(normalized);
  const transactions = selectTransactions(target.sector, target.industry);

  return {
    target,
    transactions,
    availableSectors: [...new Set(MOCK_TRANSACTIONS.map((t) => t.sector))],
    availableDealTypes: ['Strategic', 'Financial Sponsor', 'Take-Private', 'Merger of Equals'],
    provider,
    dataSource: 'mock_transactions',
  };
};

export const getMockTransactions = (): PrecedentTransaction[] => [...MOCK_TRANSACTIONS];
