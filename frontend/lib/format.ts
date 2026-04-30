export const formatCurrency = (value: number, compact = true) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: compact ? 1 : 2,
    notation: compact ? 'compact' : 'standard',
  }).format(value);

export const formatNumber = (value: number, fractionDigits = 1) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);

export const formatPercent = (value: number, fractionDigits = 1) =>
  `${formatNumber(value, fractionDigits)}%`;
