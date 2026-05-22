export type PrecedentScenarioKey = 'strategic' | 'sponsor' | 'scarcity';

export type PrecedentDealType = 'Strategic' | 'Financial Sponsor' | 'Take-Private' | 'Merger of Equals';

export interface PrecedentTargetCompany {
  ticker: string;
  companyName: string;
  stockPrice: number;
  marketCap: number;
  enterpriseValue: number;
  revenue: number;
  ebitda: number;
  netIncome: number;
  cash: number;
  debt: number;
  sharesOutstanding: number;
  sector: string;
  industry: string;
}

export interface PrecedentTransaction {
  id: string;
  acquirer: string;
  target: string;
  dealDate: string;
  dealYear: number;
  dealValue: number;
  evEbitda: number;
  evRevenue: number;
  premiumPaid: number;
  sector: string;
  dealType: PrecedentDealType;
  targetRevenue: number;
  targetEbitda: number;
}

export interface MultipleAggregate {
  median: number | null;
  average: number | null;
  p25: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
  values: number[];
}

export interface PrecedentMultipleStatistics {
  evEbitda: MultipleAggregate;
  evRevenue: MultipleAggregate;
  premiumPaid: MultipleAggregate;
}

export interface PrecedentScenarioCase {
  label: 'Strategic Buyer' | 'Financial Sponsor' | 'Scarcity Premium';
  scenarioKey: PrecedentScenarioKey;
  evEbitdaMultiple: number;
  evRevenueMultiple: number;
  premiumPaidPercent: number;
  impliedEnterpriseValue: number;
  impliedEquityValue: number;
  impliedOfferPricePerShare: number;
  controlPremiumPercent: number;
  synergyValue?: number;
  summary: string;
  narrative: string;
}

export interface PrecedentValuationPayload {
  target: PrecedentTargetCompany;
  transactions: PrecedentTransaction[];
  filters?: {
    dealTypes?: PrecedentDealType[];
    minYear?: number;
    sector?: string;
  };
}

export interface PrecedentChartData {
  multipleDistribution: Array<{ bucket: string; count: number; avgMultiple: number }>;
  premiumPaidAnalysis: Array<{ deal: string; premium: number; dealType: string }>;
  valuationRange: Array<{ label: string; price: number; scenario?: string }>;
  dealTimeline: Array<{ year: string; dealCount: number; avgPremium: number; totalDealValue: number }>;
}

export interface PrecedentValuationResult {
  target: PrecedentTargetCompany;
  transactions: PrecedentTransaction[];
  statistics: PrecedentMultipleStatistics;
  scenarios: {
    strategic: PrecedentScenarioCase;
    sponsor: PrecedentScenarioCase;
    scarcity: PrecedentScenarioCase;
  };
  valuationRange: {
    low: number;
    mid: number;
    high: number;
    currentPrice: number;
  };
  insights: string[];
  charts: PrecedentChartData;
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

const safeDivide = (numerator: number, denominator: number): number | null => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
};

const sortAsc = (values: number[]) => [...values].sort((a, b) => a - b);

const average = (values: number[]): number | null => {
  if (!values.length) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 2);
};

const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = sortAsc(values);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return round((sorted[mid - 1] + sorted[mid]) / 2, 2);
  }
  return round(sorted[mid], 2);
};

const percentile = (values: number[], p: number): number | null => {
  if (!values.length) return null;
  const sorted = sortAsc(values);
  if (sorted.length === 1) return round(sorted[0], 2);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return round(sorted[lower], 2);
  return round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower), 2);
};

const buildAggregate = (values: number[]): MultipleAggregate => ({
  median: median(values),
  average: average(values),
  p25: percentile(values, 0.25),
  p75: percentile(values, 0.75),
  min: values.length ? round(Math.min(...values), 2) : null,
  max: values.length ? round(Math.max(...values), 2) : null,
  values: values.map((v) => round(v, 2)),
});

const pickMultiple = (aggregate: MultipleAggregate, scenario: PrecedentScenarioKey): number => {
  if (scenario === 'strategic') return aggregate.p75 ?? aggregate.median ?? aggregate.average ?? 0;
  if (scenario === 'sponsor') return aggregate.median ?? aggregate.p25 ?? aggregate.average ?? 0;
  return aggregate.max ?? aggregate.p75 ?? aggregate.median ?? 0;
};

const pickPremium = (aggregate: MultipleAggregate, scenario: PrecedentScenarioKey): number => {
  if (scenario === 'strategic') return aggregate.p75 ?? aggregate.median ?? 25;
  if (scenario === 'sponsor') return aggregate.median ?? aggregate.p25 ?? 18;
  return aggregate.max ?? aggregate.p75 ?? 35;
};

const equityFromEv = (ev: number, target: PrecedentTargetCompany) => ev + target.cash - target.debt;

const sharePriceFromEquity = (equity: number, shares: number) =>
  shares > 0 ? equity / shares : 0;

const controlPremium = (offerPrice: number, currentPrice: number) =>
  currentPrice > 0 ? ((offerPrice - currentPrice) / currentPrice) * 100 : 0;

const buildScenarioCase = (
  target: PrecedentTargetCompany,
  stats: PrecedentMultipleStatistics,
  scenarioKey: PrecedentScenarioKey,
): PrecedentScenarioCase => {
  const evEbitdaMultiple = pickMultiple(stats.evEbitda, scenarioKey);
  const evRevenueMultiple = pickMultiple(stats.evRevenue, scenarioKey);
  const premiumPaidPercent = pickPremium(stats.premiumPaid, scenarioKey);

  const evFromEbitda = target.ebitda > 0 ? target.ebitda * evEbitdaMultiple : 0;
  const evFromRevenue = target.revenue > 0 ? target.revenue * evRevenueMultiple : 0;
  const impliedEnterpriseValue = evFromEbitda > 0 ? evFromEbitda : evFromRevenue;
  const impliedEquityValue = equityFromEv(impliedEnterpriseValue, target);
  const baseOfferPrice = sharePriceFromEquity(impliedEquityValue, target.sharesOutstanding);
  const impliedOfferPricePerShare = baseOfferPrice * (1 + premiumPaidPercent / 100);
  const controlPremiumPercent = controlPremium(impliedOfferPricePerShare, target.stockPrice);

  const synergyValue =
    scenarioKey === 'strategic'
      ? round(impliedEnterpriseValue * 0.08, 0)
      : scenarioKey === 'scarcity'
        ? round(impliedEnterpriseValue * 0.12, 0)
        : undefined;

  const labels: Record<PrecedentScenarioKey, PrecedentScenarioCase['label']> = {
    strategic: 'Strategic Buyer',
    sponsor: 'Financial Sponsor',
    scarcity: 'Scarcity Premium',
  };

  const narratives: Record<PrecedentScenarioKey, { summary: string; narrative: string }> = {
    strategic: {
      summary: 'Synergy-adjusted strategic acquisition case at upper-quartile transaction multiples.',
      narrative:
        'Cross-selling, cost synergies, and market expansion support premium pricing above sponsor discipline.',
    },
    sponsor: {
      summary: 'Leverage-adjusted sponsor underwriting at median precedent multiples.',
      narrative:
        'Private equity discipline anchors valuation near median comps with downside protection via capital structure.',
    },
    scarcity: {
      summary: 'Scarcity-driven control premium for unique platform assets.',
      narrative:
        'Rare strategic assets command peak multiples and elevated control premiums in competitive sale processes.',
    },
  };

  return {
    label: labels[scenarioKey],
    scenarioKey,
    evEbitdaMultiple: round(evEbitdaMultiple, 1),
    evRevenueMultiple: round(evRevenueMultiple, 1),
    premiumPaidPercent: round(premiumPaidPercent, 1),
    impliedEnterpriseValue: round(impliedEnterpriseValue, 0),
    impliedEquityValue: round(impliedEquityValue, 0),
    impliedOfferPricePerShare: round(impliedOfferPricePerShare, 2),
    controlPremiumPercent: round(controlPremiumPercent, 1),
    synergyValue,
    summary: narratives[scenarioKey].summary,
    narrative: narratives[scenarioKey].narrative,
  };
};

export const filterTransactions = (
  transactions: PrecedentTransaction[],
  filters?: PrecedentValuationPayload['filters'],
): PrecedentTransaction[] => {
  let rows = [...transactions];
  if (filters?.dealTypes?.length) {
    rows = rows.filter((row) => filters.dealTypes!.includes(row.dealType));
  }
  if (filters?.minYear) {
    rows = rows.filter((row) => row.dealYear >= filters.minYear!);
  }
  if (filters?.sector) {
    const sector = filters.sector.toLowerCase();
    rows = rows.filter((row) => row.sector.toLowerCase().includes(sector));
  }
  return rows;
};

export const computePrecedentStatistics = (
  transactions: PrecedentTransaction[],
): PrecedentMultipleStatistics => ({
  evEbitda: buildAggregate(transactions.map((t) => t.evEbitda).filter((v) => v > 0)),
  evRevenue: buildAggregate(transactions.map((t) => t.evRevenue).filter((v) => v > 0)),
  premiumPaid: buildAggregate(transactions.map((t) => t.premiumPaid).filter((v) => v > 0)),
});

const buildCharts = (
  transactions: PrecedentTransaction[],
  scenarios: PrecedentValuationResult['scenarios'],
  target: PrecedentTargetCompany,
): PrecedentChartData => {
  const ebitdaBuckets = [
    { bucket: '<10x', min: 0, max: 10 },
    { bucket: '10–15x', min: 10, max: 15 },
    { bucket: '15–20x', min: 15, max: 20 },
    { bucket: '>20x', min: 20, max: Infinity },
  ];

  const multipleDistribution = ebitdaBuckets.map(({ bucket, min, max }) => {
    const inBucket = transactions.filter((t) => t.evEbitda >= min && t.evEbitda < max);
    return {
      bucket,
      count: inBucket.length,
      avgMultiple: round(average(inBucket.map((t) => t.evEbitda)) ?? 0, 1),
    };
  });

  const premiumPaidAnalysis = transactions
    .slice()
    .sort((a, b) => b.premiumPaid - a.premiumPaid)
    .slice(0, 10)
    .map((t) => ({
      deal: `${t.acquirer} / ${t.target}`,
      premium: t.premiumPaid,
      dealType: t.dealType,
    }));

  const valuationRange = [
    { label: 'Current', price: target.stockPrice, scenario: 'market' },
    { label: 'Sponsor', price: scenarios.sponsor.impliedOfferPricePerShare, scenario: 'sponsor' },
    { label: 'Strategic', price: scenarios.strategic.impliedOfferPricePerShare, scenario: 'strategic' },
    { label: 'Scarcity', price: scenarios.scarcity.impliedOfferPricePerShare, scenario: 'scarcity' },
  ];

  const yearMap = new Map<number, { count: number; premiums: number[]; dealValues: number[] }>();
  for (const t of transactions) {
    const entry = yearMap.get(t.dealYear) ?? { count: 0, premiums: [], dealValues: [] };
    entry.count += 1;
    entry.premiums.push(t.premiumPaid);
    entry.dealValues.push(t.dealValue);
    yearMap.set(t.dealYear, entry);
  }

  const dealTimeline = [...yearMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, data]) => ({
      year: String(year),
      dealCount: data.count,
      avgPremium: round(average(data.premiums) ?? 0, 1),
      totalDealValue: round(data.dealValues.reduce((s, v) => s + v, 0), 0),
    }));

  return { multipleDistribution, premiumPaidAnalysis, valuationRange, dealTimeline };
};

export const generatePrecedentInsights = (
  target: PrecedentTargetCompany,
  stats: PrecedentMultipleStatistics,
  scenarios: PrecedentValuationResult['scenarios'],
  transactions: PrecedentTransaction[],
): string[] => {
  const insights: string[] = [];

  const medianPremium = stats.premiumPaid.median ?? 0;
  const strategicPremium = scenarios.strategic.controlPremiumPercent;
  const sponsorPremium = scenarios.sponsor.controlPremiumPercent;

  insights.push(
    `Recent acquisition multiples imply continued strategic appetite for high-quality ${target.sector.toLowerCase()} assets.`,
  );

  if (sponsorPremium < strategicPremium) {
    insights.push(
      'Private equity sponsor pricing remains below strategic buyer precedent ranges, reflecting leverage discipline.',
    );
  }

  if (medianPremium >= 25) {
    insights.push(
      'Control premiums remain elevated relative to long-term sector averages, supporting takeover valuation upside.',
    );
  } else {
    insights.push(
      'Control premiums sit below peak-cycle levels, suggesting selective M&A rather than broad auction froth.',
    );
  }

  const ebitdaMedian = stats.evEbitda.median ?? 0;
  if (ebitdaMedian > 0 && target.ebitda > 0) {
    const impliedMid = scenarios.strategic.impliedOfferPricePerShare;
    if (impliedMid > target.stockPrice * 1.15) {
      insights.push(
        'Median transaction comps support a meaningful takeover premium above the unaffected share price.',
      );
    }
  }

  const recentDeals = transactions.filter((t) => t.dealYear >= new Date().getFullYear() - 2).length;
  if (recentDeals >= 3) {
    insights.push(
      `${recentDeals} transactions in the last 24 months reinforce active strategic consolidation in the comp set.`,
    );
  }

  if (scenarios.scarcity.impliedOfferPricePerShare > scenarios.strategic.impliedOfferPricePerShare) {
    insights.push(
      'Scarcity premium case reflects competitive bidding dynamics for platform assets with limited substitutes.',
    );
  }

  return insights.slice(0, 5);
};

export function calculatePrecedentValuation(payload: PrecedentValuationPayload): PrecedentValuationResult {
  const filtered = filterTransactions(payload.transactions, payload.filters);
  const transactions = filtered.length ? filtered : payload.transactions;

  if (!transactions.length) {
    throw new Error('At least one precedent transaction is required for valuation.');
  }

  const stats = computePrecedentStatistics(transactions);
  const scenarios = {
    strategic: buildScenarioCase(payload.target, stats, 'strategic'),
    sponsor: buildScenarioCase(payload.target, stats, 'sponsor'),
    scarcity: buildScenarioCase(payload.target, stats, 'scarcity'),
  };

  const prices = [
    scenarios.sponsor.impliedOfferPricePerShare,
    scenarios.strategic.impliedOfferPricePerShare,
    scenarios.scarcity.impliedOfferPricePerShare,
  ].sort((a, b) => a - b);

  const result: PrecedentValuationResult = {
    target: payload.target,
    transactions,
    statistics: stats,
    scenarios,
    valuationRange: {
      low: round(prices[0], 2),
      mid: round(prices[1], 2),
      high: round(prices[2], 2),
      currentPrice: payload.target.stockPrice,
    },
    insights: [],
    charts: { multipleDistribution: [], premiumPaidAnalysis: [], valuationRange: [], dealTimeline: [] },
  };

  result.insights = generatePrecedentInsights(payload.target, stats, scenarios, transactions);
  result.charts = buildCharts(transactions, scenarios, payload.target);

  return result;
}
