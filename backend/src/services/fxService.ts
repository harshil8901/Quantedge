import axios from 'axios';

export type SupportedCurrency =
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

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
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

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { rates: Record<string, number>; fetchedAt: number }>();

const fetchLiveRates = async (base: string): Promise<Record<string, number>> => {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY || process.env.RAPIDAPI_KEY;
  const rapidHost = process.env.RAPIDAPI_FX_HOST || 'currency-exchange.p.rapidapi.com';

  if (apiKey && (apiKey.includes('rapidapi') || process.env.RAPIDAPI_FX_HOST)) {
    try {
      const response = await axios.get(`https://${rapidHost}/v1/convert`, {
        params: { from: base, to: SUPPORTED_CURRENCIES.filter((c) => c !== base).join(','), amount: 1 },
        headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': rapidHost },
        timeout: 12000,
      });
      const data = response.data as { rates?: Record<string, number> };
      if (data.rates) return { [base]: 1, ...data.rates };
    } catch {
      /* fall through */
    }
  }

  const response = await axios.get(`https://open.er-api.com/v6/latest/${base}`, { timeout: 12000 });
  const rates = (response.data as { rates?: Record<string, number> })?.rates;
  if (!rates) throw new Error('FX provider returned no rates.');
  return { [base]: 1, ...rates };
};

export const getFxRates = async (base = 'USD'): Promise<{ base: string; rates: Record<string, number>; source: string; asOf: string }> => {
  const normalized = base.toUpperCase();
  const cached = cache.get(normalized);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { base: normalized, rates: cached.rates, source: 'cache', asOf: new Date(cached.fetchedAt).toISOString() };
  }

  const rates = await fetchLiveRates(normalized);
  cache.set(normalized, { rates, fetchedAt: Date.now() });
  return { base: normalized, rates, source: 'live', asOf: new Date().toISOString() };
};

export const convertAmount = (
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
  manualRate?: number,
): number => {
  if (!Number.isFinite(amount)) return 0;
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return amount;
  if (manualRate && manualRate > 0 && f !== t) {
    return f === to ? amount : amount * manualRate;
  }
  const fromRate = rates[f];
  const toRate = rates[t];
  if (!fromRate || !toRate) return amount;
  const inBase = amount / fromRate;
  return inBase * toRate;
};
