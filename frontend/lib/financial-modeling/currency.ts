import type { CurrencyCode } from './types';

export const convertWithRates = (
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<string, number>,
  manualPairRate?: number,
): number => {
  if (from === to) return amount;
  if (manualPairRate && manualPairRate > 0) return amount * manualPairRate;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
};

export const formatMoney = (
  value: number,
  currency: CurrencyCode,
  compact = true,
) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
  }).format(value);
