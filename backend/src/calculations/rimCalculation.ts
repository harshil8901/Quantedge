export type RIMScenarioKey = 'bear' | 'base' | 'bull';

export interface RIMHistoricalPoint {
  year: number;
  roe: number;
  netIncome: number;
  bookValue: number;
  bookValuePerShare: number;
  retainedEarnings: number;
  revenueGrowth: number | null;
}

export interface RIMCompanyInputs {
  ticker: string;
  companyName: string;
  currentPrice: number;
  marketCap: number;
  beta: number;
  sharesOutstanding: number;
  shareholderEquity: number;
  bookValuePerShare: number;
  retainedEarnings: number;
  netIncome: number;
  eps: number;
  roe: number;
  revenueGrowth: number;
}

export interface RIMScenarioAssumptions {
  futureROE: number;
  costOfEquity: number;
  growth: number;
  forecastYears: number;
}

export interface RIMProjectionPoint {
  year: number;
  bookValue: number;
  bookValuePerShare: number;
  netIncome: number;
  equityCharge: number;
  residualIncome: number;
  presentValue: number;
  roeSpread: number;
  economicProfit: number;
}

export interface RIMScenarioOutput {
  label: 'Bear' | 'Base' | 'Bull';
  scenarioKey: RIMScenarioKey;
  assumptions: RIMScenarioAssumptions;
  intrinsicValue: number;
  intrinsicValuePerShare: number;
  bookValueComponent: number;
  pvResidualIncome: number;
  averageRoeSpread: number;
  cumulativeEconomicProfit: number;
  upsideDownsidePercent: number;
  summary: string;
  projections: RIMProjectionPoint[];
}

export interface RIMChartData {
  roeVsCostOfEquity: Array<{ year: string; roe: number; costOfEquity: number }>;
  residualIncomeProjection: Array<{ year: string; bear: number; base: number; bull: number }>;
  bookValueGrowth: Array<{ year: string; bear: number; base: number; bull: number }>;
  economicProfitTrend: Array<{ year: string; bear: number; base: number; bull: number }>;
  scenarioComparison: Array<{ label: string; intrinsicValue: number; currentPrice: number }>;
}

export interface RIMValuationPayload {
  company: RIMCompanyInputs;
  assumptions: Record<RIMScenarioKey, RIMScenarioAssumptions>;
  historical: RIMHistoricalPoint[];
}

export interface RIMValuationResult {
  company: RIMCompanyInputs;
  historical: RIMHistoricalPoint[];
  historicalStats: {
    averageRoe: number;
    bookValueCagr: number;
    netIncomeCagr: number;
    averageRevenueGrowth: number;
  };
  scenarios: {
    bear: RIMScenarioOutput;
    base: RIMScenarioOutput;
    bull: RIMScenarioOutput;
  };
  insights: string[];
  charts: RIMChartData;
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

const normalizeRate = (value: number): number => (Math.abs(value) > 1 ? value / 100 : value);

const validateAssumptions = (
  company: RIMCompanyInputs,
  assumptions: RIMScenarioAssumptions,
): string | null => {
  if (company.shareholderEquity <= 0) {
    return 'Shareholder equity must be positive for residual income valuation.';
  }
  if (company.sharesOutstanding <= 0) {
    return 'Shares outstanding must be greater than zero.';
  }
  const ke = normalizeRate(assumptions.costOfEquity);
  if (ke <= 0 || ke > 0.35) {
    return 'Cost of equity should be between 0% and 35% for institutional RIM models.';
  }
  if (assumptions.forecastYears < 3 || assumptions.forecastYears > 15) {
    return 'Forecast horizon should be between 3 and 15 years.';
  }
  const growth = normalizeRate(assumptions.growth);
  if (growth < -0.15 || growth > 0.25) {
    return 'Book value growth assumptions should remain between -15% and 25%.';
  }
  return null;
};

const projectScenario = (
  company: RIMCompanyInputs,
  assumptions: RIMScenarioAssumptions,
  label: RIMScenarioOutput['label'],
  scenarioKey: RIMScenarioKey,
): RIMScenarioOutput => {
  const roe = normalizeRate(assumptions.futureROE);
  const costOfEquity = normalizeRate(assumptions.costOfEquity);
  const growth = normalizeRate(assumptions.growth);
  const years = Math.round(assumptions.forecastYears);

  const validationError = validateAssumptions(company, assumptions);
  if (validationError) {
    return {
      label,
      scenarioKey,
      assumptions,
      intrinsicValue: 0,
      intrinsicValuePerShare: 0,
      bookValueComponent: 0,
      pvResidualIncome: 0,
      averageRoeSpread: 0,
      cumulativeEconomicProfit: 0,
      upsideDownsidePercent: 0,
      summary: validationError,
      projections: [],
    };
  }

  const shares = company.sharesOutstanding;
  let bookValue = company.shareholderEquity;
  let bookValuePerShare = company.bookValuePerShare > 0 ? company.bookValuePerShare : bookValue / shares;

  const projections: RIMProjectionPoint[] = [];
  let pvResidualIncome = 0;
  let cumulativeEconomicProfit = 0;
  const roeSpreads: number[] = [];

  for (let year = 1; year <= years; year += 1) {
    const beginningBookValue = bookValue;
    const netIncome = beginningBookValue * roe;
    const equityCharge = beginningBookValue * costOfEquity;
    const residualIncome = netIncome - equityCharge;
    const presentValue = residualIncome / (1 + costOfEquity) ** year;
    const roeSpread = (roe - costOfEquity) * 100;

    pvResidualIncome += presentValue;
    cumulativeEconomicProfit += residualIncome;
    roeSpreads.push(roeSpread);

    bookValue = beginningBookValue * (1 + growth);
    bookValuePerShare = bookValue / shares;

    projections.push({
      year,
      bookValue: round(bookValue, 0),
      bookValuePerShare: round(bookValuePerShare, 2),
      netIncome: round(netIncome, 0),
      equityCharge: round(equityCharge, 0),
      residualIncome: round(residualIncome, 0),
      presentValue: round(presentValue, 0),
      roeSpread: round(roeSpread, 2),
      economicProfit: round(residualIncome, 0),
    });
  }

  const bookValueComponent = company.shareholderEquity;
  const intrinsicValue = bookValueComponent + pvResidualIncome;
  const intrinsicValuePerShare = intrinsicValue / shares;
  const upsideDownsidePercent =
    company.currentPrice > 0
      ? ((intrinsicValuePerShare - company.currentPrice) / company.currentPrice) * 100
      : 0;
  const averageRoeSpread = roeSpreads.length
    ? roeSpreads.reduce((sum, value) => sum + value, 0) / roeSpreads.length
    : 0;

  const summaries: Record<RIMScenarioKey, string> = {
    bear:
      averageRoeSpread < 0
        ? 'Bear-case ROE trails cost of equity, implying economic value erosion versus book.'
        : 'Bear-case assumptions narrow ROE spreads, moderating residual income contribution to fair value.',
    base:
      averageRoeSpread > 2
        ? 'Base-case ROE exceeds cost of equity, supporting sustainable economic profit above book value.'
        : 'Base-case valuation reflects balanced profitability with limited residual income premium.',
    bull:
      averageRoeSpread > 5
        ? 'Bull-case ROE materially exceeds cost of equity, driving strong residual income and value creation.'
        : 'Bull-case assumptions lift intrinsic value through expanded ROE spreads and book value compounding.',
  };

  return {
    label,
    scenarioKey,
    assumptions,
    intrinsicValue: round(intrinsicValue, 0),
    intrinsicValuePerShare: round(intrinsicValuePerShare, 2),
    bookValueComponent: round(bookValueComponent, 0),
    pvResidualIncome: round(pvResidualIncome, 0),
    averageRoeSpread: round(averageRoeSpread, 2),
    cumulativeEconomicProfit: round(cumulativeEconomicProfit, 0),
    upsideDownsidePercent: round(upsideDownsidePercent, 1),
    summary: summaries[scenarioKey],
    projections,
  };
};

const computeHistoricalStats = (historical: RIMHistoricalPoint[]) => {
  if (!historical.length) {
    return { averageRoe: 0, bookValueCagr: 0, netIncomeCagr: 0, averageRevenueGrowth: 0 };
  }

  const sorted = [...historical].sort((a, b) => a.year - b.year);
  const roeValues = sorted.map((h) => h.roe).filter((v) => Number.isFinite(v));
  const averageRoe = roeValues.length ? roeValues.reduce((a, b) => a + b, 0) / roeValues.length : 0;

  const firstBv = sorted[0].bookValue;
  const lastBv = sorted[sorted.length - 1].bookValue;
  const bvYears = sorted[sorted.length - 1].year - sorted[0].year;
  const bookValueCagr =
    bvYears > 0 && firstBv > 0 ? (Math.pow(lastBv / firstBv, 1 / bvYears) - 1) * 100 : 0;

  const firstNi = sorted[0].netIncome;
  const lastNi = sorted[sorted.length - 1].netIncome;
  const niYears = sorted[sorted.length - 1].year - sorted[0].year;
  const netIncomeCagr =
    niYears > 0 && firstNi > 0 && lastNi > 0 ? (Math.pow(lastNi / firstNi, 1 / niYears) - 1) * 100 : 0;

  const revenueGrowthValues = sorted
    .map((h) => h.revenueGrowth)
    .filter((v): v is number => v != null && Number.isFinite(v));
  const averageRevenueGrowth = revenueGrowthValues.length
    ? revenueGrowthValues.reduce((a, b) => a + b, 0) / revenueGrowthValues.length
    : 0;

  return {
    averageRoe: round(averageRoe, 2),
    bookValueCagr: round(bookValueCagr, 2),
    netIncomeCagr: round(netIncomeCagr, 2),
    averageRevenueGrowth: round(averageRevenueGrowth, 2),
  };
};

const buildCharts = (
  scenarios: RIMValuationResult['scenarios'],
  historical: RIMHistoricalPoint[],
  currentPrice: number,
  baseAssumptions: RIMScenarioAssumptions,
): RIMChartData => {
  const maxYears = Math.max(
    scenarios.bear.projections.length,
    scenarios.base.projections.length,
    scenarios.bull.projections.length,
  );

  const baseKe = normalizeRate(baseAssumptions.costOfEquity) * 100;

  const roeVsCostOfEquity = [
    ...historical.slice(-6).map((h) => ({
      year: String(h.year),
      roe: round(h.roe, 2),
      costOfEquity: baseKe,
    })),
    ...scenarios.base.projections.map((p) => ({
      year: `Y${p.year}`,
      roe: round(normalizeRate(baseAssumptions.futureROE) * 100, 2),
      costOfEquity: baseKe,
    })),
  ];

  const residualIncomeProjection = Array.from({ length: maxYears }, (_, index) => ({
    year: `Y${index + 1}`,
    bear: scenarios.bear.projections[index]?.residualIncome ?? 0,
    base: scenarios.base.projections[index]?.residualIncome ?? 0,
    bull: scenarios.bull.projections[index]?.residualIncome ?? 0,
  }));

  const bookValueGrowth = Array.from({ length: maxYears }, (_, index) => ({
    year: `Y${index + 1}`,
    bear: scenarios.bear.projections[index]?.bookValuePerShare ?? 0,
    base: scenarios.base.projections[index]?.bookValuePerShare ?? 0,
    bull: scenarios.bull.projections[index]?.bookValuePerShare ?? 0,
  }));

  const economicProfitTrend = Array.from({ length: maxYears }, (_, index) => ({
    year: `Y${index + 1}`,
    bear: scenarios.bear.projections[index]?.economicProfit ?? 0,
    base: scenarios.base.projections[index]?.economicProfit ?? 0,
    bull: scenarios.bull.projections[index]?.economicProfit ?? 0,
  }));

  return {
    roeVsCostOfEquity,
    residualIncomeProjection,
    bookValueGrowth,
    economicProfitTrend,
    scenarioComparison: [
      {
        label: 'Bear',
        intrinsicValue: scenarios.bear.intrinsicValuePerShare,
        currentPrice,
      },
      {
        label: 'Base',
        intrinsicValue: scenarios.base.intrinsicValuePerShare,
        currentPrice,
      },
      {
        label: 'Bull',
        intrinsicValue: scenarios.bull.intrinsicValuePerShare,
        currentPrice,
      },
    ],
  };
};

export const generateRIMInsights = (
  company: RIMCompanyInputs,
  stats: RIMValuationResult['historicalStats'],
  scenarios: RIMValuationResult['scenarios'],
): string[] => {
  const insights: string[] = [];
  const base = scenarios.base;

  if (base.averageRoeSpread > 0) {
    insights.push(
      'Projected ROE remains above cost of equity across forecast periods, supporting continued economic value creation.',
    );
  } else if (base.averageRoeSpread < -1) {
    insights.push(
      'Base-case ROE trails the equity charge, indicating residual income erosion and limited premium to book value.',
    );
  }

  if (scenarios.bear.averageRoeSpread < scenarios.base.averageRoeSpread - 3) {
    insights.push(
      'Residual income generation weakens in bear-case assumptions due to narrowing ROE spreads.',
    );
  }

  if (stats.bookValueCagr > 0) {
    insights.push(
      `Historical book value CAGR of ${stats.bookValueCagr.toFixed(1)}% remains a major contributor to long-term intrinsic valuation.`,
    );
  }

  if (Math.abs(base.upsideDownsidePercent) < 8) {
    insights.push('Base-case RIM implies the equity is broadly fairly valued relative to current market price.');
  } else if (base.upsideDownsidePercent > 12) {
    insights.push('Base-case residual income valuation suggests meaningful upside versus the current quote.');
  } else if (base.upsideDownsidePercent < -12) {
    insights.push('Market price may embed expectations above sustainable residual income under base-case assumptions.');
  }

  if (company.roe > stats.averageRoe && stats.averageRoe > 0) {
    insights.push('Trailing ROE screens above multi-year historical averages, supporting premium profitability assumptions.');
  }

  const spreadRange =
    scenarios.bull.intrinsicValuePerShare - scenarios.bear.intrinsicValuePerShare;
  if (spreadRange / Math.max(scenarios.base.intrinsicValuePerShare, 1) > 0.35) {
    insights.push('Valuation range remains highly sensitive to ROE and cost of equity scenario inputs.');
  }

  return insights.slice(0, 5);
};

export function calculateRIMValuation(payload: RIMValuationPayload): RIMValuationResult {
  const { company, assumptions, historical } = payload;

  const bear = projectScenario(company, assumptions.bear, 'Bear', 'bear');
  const base = projectScenario(company, assumptions.base, 'Base', 'base');
  const bull = projectScenario(company, assumptions.bull, 'Bull', 'bull');

  const scenarios = { bear, base, bull };
  const historicalStats = computeHistoricalStats(historical);
  const charts = buildCharts(scenarios, historical, company.currentPrice, assumptions.base);
  const insights = generateRIMInsights(company, historicalStats, scenarios);

  return {
    company,
    historical,
    historicalStats,
    scenarios,
    insights,
    charts,
  };
}
