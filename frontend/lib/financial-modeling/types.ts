export type DataInputMode = 'api' | 'manual' | 'hybrid';

export type CurrencyCode =
  | 'USD'
  | 'INR'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'CAD'
  | 'AUD'
  | 'SGD'
  | 'CHF'
  | 'CNY'
  | 'HKD'
  | 'AED';

export type UnitScale = 'raw' | 'thousands' | 'millions' | 'billions' | 'trillions';

export type CompanyProfile = {
  companyName: string;
  ticker: string;
  currency: CurrencyCode;
  industry: string;
  region: string;
  stockPrice: number;
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
};

export type ModelingPreferences = {
  inputMode: DataInputMode;
  baseCurrency: CurrencyCode;
  companyCurrency: CurrencyCode;
  displayUnit: UnitScale;
  useLiveFx: boolean;
  fxOverrides: Partial<Record<string, number>>;
  fxRates: Record<string, number>;
};

export const CURRENCY_OPTIONS: CurrencyCode[] = [
  'USD',
  'INR',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'SGD',
  'CHF',
  'CNY',
  'HKD',
  'AED',
];

export const UNIT_OPTIONS: Array<{ value: UnitScale; label: string }> = [
  { value: 'raw', label: 'Actual' },
  { value: 'thousands', label: 'Thousands (K)' },
  { value: 'millions', label: 'Millions (M)' },
  { value: 'billions', label: 'Billions (B)' },
  { value: 'trillions', label: 'Trillions (T)' },
];

export const defaultCompanyProfile = (): CompanyProfile => ({
  companyName: '',
  ticker: '',
  currency: 'USD',
  industry: '',
  region: '',
  stockPrice: 0,
  marketCap: 0,
  sharesOutstanding: 0,
  revenue: 0,
  ebitda: 0,
  ebit: 0,
  netIncome: 0,
  cash: 0,
  debt: 0,
  workingCapital: 0,
  freeCashFlow: 0,
  capex: 0,
  depreciationAndAmortization: 0,
  historicalRevenueGrowth: 5,
  historicalEbitdaMargin: 20,
  historicalEbitMargin: 15,
  historicalFcfMargin: 10,
});

export const defaultModelingPreferences = (): ModelingPreferences => ({
  inputMode: 'hybrid',
  baseCurrency: 'USD',
  companyCurrency: 'USD',
  displayUnit: 'millions',
  useLiveFx: true,
  fxOverrides: {},
  fxRates: { USD: 1 },
});
