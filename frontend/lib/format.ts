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

export const formatDecimal = (value: number, fractionDigits = 2) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  }).format(value);

export const formatPercent = (value: number, fractionDigits = 1) =>
  `${formatNumber(value, fractionDigits)}%`;

export const formatMultiple = (value: number | null | undefined, fractionDigits = 1) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${formatNumber(value, fractionDigits)}x`;
};

/** Recharts Tooltip formatter — accepts ValueType | undefined from recharts v3 */
export const chartTooltipCurrency =
  (compact = true) =>
  (value: unknown) =>
    formatCurrency(Number(value ?? 0), compact);

export const chartTooltipPercent = (value: unknown) => formatPercent(Number(value ?? 0));
