export type CompsMultipleKey = 'evEbitda' | 'evRevenue' | 'pe';

export interface CompsFinancials {
  ticker: string;
  companyName: string;
  stockPrice: number;
  marketCap: number;
  enterpriseValue: number;
  revenue: number;
  ebitda: number;
  ebit: number;
  netIncome: number;
  cash: number;
  debt: number;
  sharesOutstanding: number;
  ebitdaMargin: number;
  revenueGrowth: number;
}

export interface CompsMultiples {
  evEbitda: number | null;
  evRevenue: number | null;
  pe: number | null;
}

export interface CompsPeerRow extends CompsFinancials {
  multiples: CompsMultiples;
  isValid: boolean;
  excludeReason?: string;
}

export interface MultipleAggregate {
  median: number | null;
  average: number | null;
  p25: number | null;
  p75: number | null;
  values: number[];
}

export interface CompsMultipleStatistics {
  evEbitda: MultipleAggregate;
  evRevenue: MultipleAggregate;
  pe: MultipleAggregate;
}

export interface CompsValuationCase {
  label: 'Conservative' | 'Base' | 'Premium';
  multipleKey: CompsMultipleKey;
  multipleUsed: number;
  impliedEnterpriseValue: number;
  equityValue: number;
  intrinsicValuePerShare: number;
  upsideDownsidePercent: number;
  summary: string;
}

export interface CompsValuationPayload {
  target: CompsFinancials;
  peers: CompsFinancials[];
  selectedMultiple?: CompsMultipleKey;
  analystMultiples?: {
    conservative?: number;
    base?: number;
    premium?: number;
  };
}

export interface CompsChartData {
  multipleKey: CompsMultipleKey;
  peerMultipleComparison: Array<{ ticker: string; companyName: string; multiple: number; isTarget?: boolean }>;
  multipleDistribution: Array<{ ticker: string; value: number }>;
  valuationRange: Array<{ label: string; price: number }>;
  premiumDiscountScatter: Array<{ ticker: string; multiple: number; revenueGrowth: number; isTarget?: boolean }>;
}

export interface CompsValuationResult {
  target: CompsPeerRow;
  peers: CompsPeerRow[];
  statistics: CompsMultipleStatistics;
  valuations: {
    conservative: CompsValuationCase;
    base: CompsValuationCase;
    premium: CompsValuationCase;
  };
  selectedMultiple: CompsMultipleKey;
  insights: string[];
  charts: CompsChartData;
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

const safeDivide = (numerator: number, denominator: number): number | null => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
};

const sortAsc = (values: number[]) => [...values].sort((a, b) => a - b);

const average = (values: number[]): number | null => {
  if (!values.length) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 3);
};

const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = sortAsc(values);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return round((sorted[mid - 1] + sorted[mid]) / 2, 3);
  }
  return round(sorted[mid], 3);
};

const percentile = (values: number[], p: number): number | null => {
  if (!values.length) return null;
  const sorted = sortAsc(values);
  if (sorted.length === 1) return round(sorted[0], 3);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return round(sorted[lower], 3);
  const weight = index - lower;
  return round(sorted[lower] * (1 - weight) + sorted[upper] * weight, 3);
};

export const deriveEnterpriseValue = (marketCap: number, debt: number, cash: number): number =>
  marketCap + debt - cash;

export const calculateMultiples = (financials: CompsFinancials): CompsMultiples => {
  const { enterpriseValue, marketCap, revenue, ebitda, netIncome } = financials;

  const evEbitda =
    ebitda > 0 ? safeDivide(enterpriseValue, ebitda) : ebitda < 0 ? null : null;
  const evRevenue = revenue > 0 ? safeDivide(enterpriseValue, revenue) : null;
  const pe = netIncome > 0 ? safeDivide(marketCap, netIncome) : null;

  return {
    evEbitda: evEbitda == null ? null : round(evEbitda, 2),
    evRevenue: evRevenue == null ? null : round(evRevenue, 2),
    pe: pe == null ? null : round(pe, 2),
  };
};

const isValidPeer = (financials: CompsFinancials, multiples: CompsMultiples): { valid: boolean; reason?: string } => {
  if (!financials.ticker) return { valid: false, reason: 'Missing ticker' };
  if (financials.revenue <= 0 && financials.ebitda <= 0) return { valid: false, reason: 'Insufficient financials' };
  if (!multiples.evEbitda && !multiples.evRevenue && !multiples.pe) {
    return { valid: false, reason: 'No valid trading multiples' };
  }
  return { valid: true };
};

export const toPeerRow = (financials: CompsFinancials): CompsPeerRow => {
  const multiples = calculateMultiples(financials);
  const validity = isValidPeer(financials, multiples);
  return {
    ...financials,
    multiples,
    isValid: validity.valid,
    excludeReason: validity.reason,
  };
};

const aggregateMultiple = (rows: CompsPeerRow[], key: keyof CompsMultiples): MultipleAggregate => {
  const values = rows
    .filter((row) => row.isValid)
    .map((row) => row.multiples[key])
    .filter((value): value is number => value != null && Number.isFinite(value) && value > 0);

  return {
    median: median(values),
    average: average(values),
    p25: percentile(values, 0.25),
    p75: percentile(values, 0.75),
    values,
  };
};

export const buildMultipleStatistics = (peers: CompsPeerRow[]): CompsMultipleStatistics => ({
  evEbitda: aggregateMultiple(peers, 'evEbitda'),
  evRevenue: aggregateMultiple(peers, 'evRevenue'),
  pe: aggregateMultiple(peers, 'pe'),
});

const resolveCaseMultiple = (
  stats: MultipleAggregate,
  caseLabel: CompsValuationCase['label'],
  override?: number,
): number | null => {
  if (override != null && Number.isFinite(override) && override > 0) return round(override, 2);
  if (caseLabel === 'Conservative') return stats.p25 ?? stats.median;
  if (caseLabel === 'Base') return stats.median;
  return stats.p75 ?? stats.median;
};

const buildValuationCase = (
  label: CompsValuationCase['label'],
  target: CompsFinancials,
  multipleKey: CompsMultipleKey,
  multipleUsed: number | null,
): CompsValuationCase | null => {
  if (multipleUsed == null || multipleUsed <= 0 || target.sharesOutstanding <= 0) return null;

  let impliedEnterpriseValue = 0;
  if (multipleKey === 'pe') {
    const equityValue = target.netIncome > 0 ? target.netIncome * multipleUsed : 0;
    impliedEnterpriseValue = equityValue + target.debt - target.cash;
  } else if (multipleKey === 'evRevenue') {
    impliedEnterpriseValue = target.revenue > 0 ? target.revenue * multipleUsed : 0;
  } else {
    impliedEnterpriseValue = target.ebitda > 0 ? target.ebitda * multipleUsed : 0;
  }

  if (impliedEnterpriseValue <= 0) return null;

  const equityValue = impliedEnterpriseValue + target.cash - target.debt;
  const intrinsicValuePerShare = equityValue / target.sharesOutstanding;
  const upsideDownsidePercent =
    target.stockPrice > 0 ? ((intrinsicValuePerShare - target.stockPrice) / target.stockPrice) * 100 : 0;

  const summaries: Record<CompsValuationCase['label'], string> = {
    Conservative: 'Lower-quartile peer multiple applied to target operating metrics.',
    Base: 'Median peer multiple applied as primary institutional fair value anchor.',
    Premium: 'Upper-quartile peer multiple applied for premium growth/margin scenario.',
  };

  return {
    label,
    multipleKey,
    multipleUsed,
    impliedEnterpriseValue: round(impliedEnterpriseValue, 0),
    equityValue: round(equityValue, 0),
    intrinsicValuePerShare: round(intrinsicValuePerShare, 2),
    upsideDownsidePercent: round(upsideDownsidePercent, 1),
    summary: summaries[label],
  };
};

export const generateCompsInsights = (
  target: CompsPeerRow,
  statistics: CompsMultipleStatistics,
  valuations: CompsValuationResult['valuations'],
  validPeerCount: number,
): string[] => {
  const insights: string[] = [];
  const targetEvEbitda = target.multiples.evEbitda;
  const medianEvEbitda = statistics.evEbitda.median;

  if (targetEvEbitda != null && medianEvEbitda != null) {
    const discount = ((targetEvEbitda - medianEvEbitda) / medianEvEbitda) * 100;
    if (discount <= -8) {
      insights.push(
        `Target screens below peer median EV/EBITDA (${medianEvEbitda.toFixed(1)}x) despite comparable revenue scale.`,
      );
    } else if (discount >= 8) {
      insights.push(
        `Target trades at a premium to peer median EV/EBITDA (${medianEvEbitda.toFixed(1)}x), implying elevated growth expectations.`,
      );
    } else {
      insights.push(`Target EV/EBITDA is broadly in line with peer median (${medianEvEbitda.toFixed(1)}x).`);
    }
  }

  const spreadValues = statistics.evEbitda.values;
  if (spreadValues.length >= 3 && statistics.evEbitda.median) {
    const dispersion =
      (Math.max(...spreadValues) - Math.min(...spreadValues)) / Math.max(statistics.evEbitda.median, 0.01);
    if (dispersion > 0.35) {
      insights.push('Peer group dispersion suggests elevated uncertainty in sector valuation multiples.');
    }
  }

  const baseUpside = valuations.base.upsideDownsidePercent;
  if (baseUpside >= 12) {
    insights.push('Base-case median comp implies meaningful upside versus current market price.');
  } else if (baseUpside <= -12) {
    insights.push('Base-case median comp implies the target may be priced above peer-implied fair value.');
  }

  if (validPeerCount < 4) {
    insights.push('Limited peer sample size increases valuation sensitivity; expand peer set for institutional confidence.');
  } else if (valuations.premium.upsideDownsidePercent - valuations.conservative.upsideDownsidePercent > 35) {
    insights.push('Wide valuation range reflects multiple dispersion and scenario spread across conservative and premium cases.');
  }

  return insights.slice(0, 4);
};

export const buildCompsCharts = (
  target: CompsPeerRow,
  peers: CompsPeerRow[],
  valuations: CompsValuationResult['valuations'],
  multipleKey: CompsMultipleKey,
): CompsChartData => {
  const readMultiple = (row: CompsPeerRow) => row.multiples[multipleKey];
  const validPeers = peers.filter((peer) => peer.isValid && readMultiple(peer) != null && (readMultiple(peer) ?? 0) > 0);

  const peerMultipleComparison = [
    {
      ticker: target.ticker,
      companyName: target.companyName,
      multiple: readMultiple(target) ?? 0,
      isTarget: true,
    },
    ...validPeers.map((peer) => ({
      ticker: peer.ticker,
      companyName: peer.companyName,
      multiple: readMultiple(peer) ?? 0,
    })),
  ].filter((row) => row.multiple > 0);

  return {
    multipleKey,
    peerMultipleComparison,
    multipleDistribution: validPeers.map((peer) => ({
      ticker: peer.ticker,
      value: readMultiple(peer) ?? 0,
    })),
    valuationRange: [
      { label: 'Conservative', price: valuations.conservative.intrinsicValuePerShare },
      { label: 'Base', price: valuations.base.intrinsicValuePerShare },
      { label: 'Premium', price: valuations.premium.intrinsicValuePerShare },
      { label: 'Current', price: target.stockPrice },
    ],
    premiumDiscountScatter: [
      {
        ticker: target.ticker,
        multiple: readMultiple(target) ?? 0,
        revenueGrowth: target.revenueGrowth,
        isTarget: true,
      },
      ...validPeers.map((peer) => ({
        ticker: peer.ticker,
        multiple: readMultiple(peer) ?? 0,
        revenueGrowth: peer.revenueGrowth,
      })),
    ].filter((row) => row.multiple > 0),
  };
};

export function calculateCompsValuation(payload: CompsValuationPayload): CompsValuationResult {
  const selectedMultiple: CompsMultipleKey = payload.selectedMultiple || 'evEbitda';
  const targetRow = toPeerRow(payload.target);
  const peerRows = payload.peers.map(toPeerRow);
  const validPeers = peerRows.filter((peer) => peer.isValid);
  const statistics = buildMultipleStatistics(peerRows);
  const statsForKey = statistics[selectedMultiple];

  const conservative =
    buildValuationCase(
      'Conservative',
      payload.target,
      selectedMultiple,
      resolveCaseMultiple(statsForKey, 'Conservative', payload.analystMultiples?.conservative),
    ) ??
    buildValuationCase('Conservative', payload.target, 'evEbitda', statistics.evEbitda.p25)!;

  const base =
    buildValuationCase(
      'Base',
      payload.target,
      selectedMultiple,
      resolveCaseMultiple(statsForKey, 'Base', payload.analystMultiples?.base),
    ) ??
    buildValuationCase('Base', payload.target, 'evEbitda', statistics.evEbitda.median)!;

  const premium =
    buildValuationCase(
      'Premium',
      payload.target,
      selectedMultiple,
      resolveCaseMultiple(statsForKey, 'Premium', payload.analystMultiples?.premium),
    ) ??
    buildValuationCase('Premium', payload.target, 'evEbitda', statistics.evEbitda.p75)!;

  const valuations = { conservative, base, premium };
  const insights = generateCompsInsights(targetRow, statistics, valuations, validPeers.length);
  const charts = buildCompsCharts(targetRow, peerRows, valuations, selectedMultiple);

  return {
    target: targetRow,
    peers: peerRows,
    statistics,
    valuations,
    selectedMultiple,
    insights,
    charts,
  };
}

// Legacy calculator support
export interface CompsInputs {
  revenue: number;
  ebitda: number;
  netIncome: number;
  sharePrice: number;
  enterpriseValue: number;
  peerMultiple: number;
  peerMultiples?: number[];
  sharesOutstanding?: number;
}

export interface CompsScenario {
  label: 'Conservative' | 'Base' | 'Premium';
  multiple: number;
  impliedEnterpriseValue: number;
  impliedSharePrice: number;
}

export interface CompsResult {
  evEbitda: number;
  pe: number;
  evSales: number;
  impliedValuation: number;
  impliedEnterpriseValue: number;
  impliedSharePrice: number;
  valuationRange: { low: number; high: number };
  scenarios: CompsScenario[];
  peerComparison: Array<{ peer: string; multiple: number }>;
  multipleDistribution: Array<{ bucket: string; count: number }>;
}

export function calculateComps(inputs: CompsInputs): CompsResult {
  const sharesOutstanding = inputs.sharesOutstanding || 1;
  const marketCap = inputs.sharePrice * sharesOutstanding;
  const target: CompsFinancials = {
    ticker: 'TARGET',
    companyName: 'Target Company',
    stockPrice: inputs.sharePrice,
    marketCap,
    enterpriseValue: inputs.enterpriseValue,
    revenue: inputs.revenue,
    ebitda: inputs.ebitda,
    ebit: inputs.ebitda * 0.85,
    netIncome: inputs.netIncome,
    cash: 0,
    debt: 0,
    sharesOutstanding,
    ebitdaMargin: inputs.revenue > 0 ? (inputs.ebitda / inputs.revenue) * 100 : 0,
    revenueGrowth: 0,
  };

  const peerMultiples = inputs.peerMultiples?.length
    ? inputs.peerMultiples
    : [inputs.peerMultiple * 0.85, inputs.peerMultiple, inputs.peerMultiple * 1.15];

  const peers: CompsFinancials[] = peerMultiples.map((multiple, index) => ({
    ...target,
    ticker: `PEER${index + 1}`,
    companyName: `Peer ${index + 1}`,
    enterpriseValue: inputs.ebitda * multiple,
    marketCap: inputs.ebitda * multiple,
  }));

  const valuation = calculateCompsValuation({ target, peers, selectedMultiple: 'evEbitda' });
  const base = valuation.valuations.base;

  return {
    evEbitda: valuation.target.multiples.evEbitda ?? 0,
    pe: valuation.target.multiples.pe ?? 0,
    evSales: valuation.target.multiples.evRevenue ?? 0,
    impliedValuation: base.impliedEnterpriseValue,
    impliedEnterpriseValue: base.impliedEnterpriseValue,
    impliedSharePrice: base.intrinsicValuePerShare,
    valuationRange: {
      low: valuation.valuations.conservative.intrinsicValuePerShare,
      high: valuation.valuations.premium.intrinsicValuePerShare,
    },
    scenarios: [
      {
        label: 'Conservative',
        multiple: valuation.valuations.conservative.multipleUsed,
        impliedEnterpriseValue: valuation.valuations.conservative.impliedEnterpriseValue,
        impliedSharePrice: valuation.valuations.conservative.intrinsicValuePerShare,
      },
      {
        label: 'Base',
        multiple: valuation.valuations.base.multipleUsed,
        impliedEnterpriseValue: valuation.valuations.base.impliedEnterpriseValue,
        impliedSharePrice: valuation.valuations.base.intrinsicValuePerShare,
      },
      {
        label: 'Premium',
        multiple: valuation.valuations.premium.multipleUsed,
        impliedEnterpriseValue: valuation.valuations.premium.impliedEnterpriseValue,
        impliedSharePrice: valuation.valuations.premium.intrinsicValuePerShare,
      },
    ],
    peerComparison: valuation.peers
      .filter((peer) => peer.isValid)
      .map((peer) => ({ peer: peer.ticker, multiple: peer.multiples.evEbitda ?? 0 })),
    multipleDistribution: [
      { bucket: 'Low', count: valuation.statistics.evEbitda.values.filter((v) => v < (valuation.statistics.evEbitda.median ?? 0) * 0.95).length },
      { bucket: 'Median', count: 1 },
      { bucket: 'High', count: valuation.statistics.evEbitda.values.filter((v) => v > (valuation.statistics.evEbitda.median ?? 0) * 1.05).length },
    ],
  };
}
