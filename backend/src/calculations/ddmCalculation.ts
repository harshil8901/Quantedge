export type DDMScenarioKey = 'bear' | 'base' | 'bull';

export interface DDMHistoricalPoint {
  year: number;
  dividend: number;
  payoutRatio: number | null;
  yieldPercent: number | null;
}

export interface DDMCompanyInputs {
  ticker: string;
  companyName: string;
  currentPrice: number;
  marketCap: number;
  beta: number;
  dividendPerShare: number;
  dividendYield: number;
  payoutRatio: number;
  eps: number;
  netIncome: number;
  sharesOutstanding: number;
}

export interface DDMScenarioAssumptions {
  dividendGrowth: number;
  costOfEquity: number;
  stableGrowth: number;
  forecastYears: number;
}

export interface DDMProjectionPoint {
  year: number;
  dividend: number;
  presentValue: number;
}

export interface DDMScenarioOutput {
  label: 'Bear' | 'Base' | 'Bull';
  scenarioKey: DDMScenarioKey;
  assumptions: DDMScenarioAssumptions;
  intrinsicValue: number;
  terminalValue: number;
  terminalValuePv: number;
  projectedYield: number;
  upsideDownsidePercent: number;
  summary: string;
  dividendProjections: DDMProjectionPoint[];
}

export interface DDMSensitivityCell {
  costOfEquity: number;
  stableGrowth: number;
  intrinsicValue: number;
}

export interface DDMChartData {
  dividendProjection: Array<{ year: string; bear: number; base: number; bull: number }>;
  yieldTrend: Array<{ year: number; yieldPercent: number }>;
  scenarioComparison: Array<{ label: string; intrinsicValue: number; currentPrice: number }>;
  sensitivityMatrix: DDMSensitivityCell[];
}

export interface DDMValuationPayload {
  company: DDMCompanyInputs;
  assumptions: Record<DDMScenarioKey, DDMScenarioAssumptions>;
  historical: DDMHistoricalPoint[];
}

export interface DDMValuationResult {
  company: DDMCompanyInputs;
  historical: DDMHistoricalPoint[];
  historicalStats: {
    dividendCagr: number;
    averagePayoutRatio: number;
    averageYield: number;
  };
  scenarios: {
    bear: DDMScenarioOutput;
    base: DDMScenarioOutput;
    bull: DDMScenarioOutput;
  };
  insights: string[];
  charts: DDMChartData;
}

export interface DDMInputs {
  dividendPerShare: number;
  dividendGrowth: number;
  costOfEquity: number;
}

export interface DDMScenario {
  label: 'Low Growth' | 'Stable Growth' | 'High Growth';
  growthRate: number;
  intrinsicValue: number;
}

export interface DDMResult {
  intrinsicValue: number;
  dividendForecast: number[];
  summary: string;
  scenarios: DDMScenario[];
  sensitivity: Array<{ costOfEquity: number; value: number }>;
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

const normalizeRate = (value: number): number => (Math.abs(value) > 1 ? value / 100 : value);

const validateAssumptions = (
  dividendPerShare: number,
  assumptions: DDMScenarioAssumptions,
): string | null => {
  if (dividendPerShare <= 0) return 'Current dividend per share must be greater than zero.';
  const gStable = normalizeRate(assumptions.stableGrowth);
  const r = normalizeRate(assumptions.costOfEquity);
  if (r <= gStable) return 'Cost of equity must exceed stable growth rate (Gordon model constraint).';
  if (gStable > 0.06) return 'Stable growth above 6% is typically unrealistic for perpetual terminal assumptions.';
  if (r < 0.04 || r > 0.25) return 'Cost of equity should be between 4% and 25% for institutional DDM models.';
  if (assumptions.forecastYears < 3 || assumptions.forecastYears > 15) {
    return 'Forecast horizon should be between 3 and 15 years.';
  }
  return null;
};

const projectScenario = (
  dividendPerShare: number,
  currentPrice: number,
  assumptions: DDMScenarioAssumptions,
  label: DDMScenarioOutput['label'],
  scenarioKey: DDMScenarioKey,
): DDMScenarioOutput => {
  const growth = normalizeRate(assumptions.dividendGrowth);
  const costOfEquity = normalizeRate(assumptions.costOfEquity);
  const stableGrowth = normalizeRate(assumptions.stableGrowth);
  const years = Math.round(assumptions.forecastYears);

  const validationError = validateAssumptions(dividendPerShare, assumptions);
  if (validationError) {
    return {
      label,
      scenarioKey,
      assumptions,
      intrinsicValue: 0,
      terminalValue: 0,
      terminalValuePv: 0,
      projectedYield: 0,
      upsideDownsidePercent: 0,
      summary: validationError,
      dividendProjections: [],
    };
  }

  const dividendProjections: DDMProjectionPoint[] = [];
  let dividend = dividendPerShare;
  let pvSum = 0;

  for (let year = 1; year <= years; year += 1) {
    dividend *= 1 + growth;
    const presentValue = dividend / (1 + costOfEquity) ** year;
    pvSum += presentValue;
    dividendProjections.push({ year, dividend: round(dividend, 3), presentValue: round(presentValue, 3) });
  }

  const terminalDividend = dividend * (1 + stableGrowth);
  const spread = Math.max(costOfEquity - stableGrowth, 0.005);
  const terminalValue = terminalDividend / spread;
  const terminalValuePv = terminalValue / (1 + costOfEquity) ** years;
  const intrinsicValue = pvSum + terminalValuePv;
  const lastDividend = dividendProjections[dividendProjections.length - 1]?.dividend ?? dividend;
  const projectedYield = currentPrice > 0 ? (lastDividend / currentPrice) * 100 : 0;
  const upsideDownsidePercent =
    currentPrice > 0 ? ((intrinsicValue - currentPrice) / currentPrice) * 100 : 0;

  const summaries: Record<DDMScenarioKey, string> = {
    bear: 'Conservative dividend growth and elevated cost of equity anchor downside fair value.',
    base: 'Base-case assumptions reflect sustainable payout growth and median cost of equity.',
    bull: 'Optimistic dividend growth with supportive cost of equity implies premium income valuation.',
  };

  return {
    label,
    scenarioKey,
    assumptions,
    intrinsicValue: round(intrinsicValue, 2),
    terminalValue: round(terminalValue, 2),
    terminalValuePv: round(terminalValuePv, 2),
    projectedYield: round(projectedYield, 2),
    upsideDownsidePercent: round(upsideDownsidePercent, 1),
    summary: summaries[scenarioKey],
    dividendProjections,
  };
};

const computeHistoricalStats = (historical: DDMHistoricalPoint[]) => {
  if (historical.length < 2) {
    const payoutValues = historical.map((h) => h.payoutRatio).filter((v): v is number => v != null);
    const yieldValues = historical.map((h) => h.yieldPercent).filter((v): v is number => v != null);
    return {
      dividendCagr: 0,
      averagePayoutRatio: payoutValues.length ? round(payoutValues.reduce((a, b) => a + b, 0) / payoutValues.length, 2) : 0,
      averageYield: yieldValues.length ? round(yieldValues.reduce((a, b) => a + b, 0) / yieldValues.length, 2) : 0,
    };
  }
  const sorted = [...historical].sort((a, b) => a.year - b.year);
  const first = sorted[0].dividend;
  const last = sorted[sorted.length - 1].dividend;
  const years = sorted[sorted.length - 1].year - sorted[0].year;
  const dividendCagr = years > 0 && first > 0 ? (Math.pow(last / first, 1 / years) - 1) * 100 : 0;
  const payoutValues = sorted.map((h) => h.payoutRatio).filter((v): v is number => v != null);
  const yieldValues = sorted.map((h) => h.yieldPercent).filter((v): v is number => v != null);
  return {
    dividendCagr: round(dividendCagr, 2),
    averagePayoutRatio: payoutValues.length ? round(payoutValues.reduce((a, b) => a + b, 0) / payoutValues.length, 2) : 0,
    averageYield: yieldValues.length ? round(yieldValues.reduce((a, b) => a + b, 0) / yieldValues.length, 2) : 0,
  };
};

const buildSensitivityMatrix = (
  dividendPerShare: number,
  baseAssumptions: DDMScenarioAssumptions,
): DDMSensitivityCell[] => {
  const baseR = normalizeRate(baseAssumptions.costOfEquity);
  const baseG = normalizeRate(baseAssumptions.stableGrowth);
  const rSteps = [-0.02, -0.01, 0, 0.01, 0.02];
  const gSteps = [-0.01, -0.005, 0, 0.005, 0.01];
  const cells: DDMSensitivityCell[] = [];

  for (const rStep of rSteps) {
    for (const gStep of gSteps) {
      const assumptions: DDMScenarioAssumptions = {
        ...baseAssumptions,
        costOfEquity: (baseR + rStep) * 100,
        stableGrowth: Math.max(0.005, baseG + gStep) * 100,
      };
      const output = projectScenario(dividendPerShare, 1, assumptions, 'Base', 'base');
      cells.push({
        costOfEquity: round((baseR + rStep) * 100, 2),
        stableGrowth: round(Math.max(0.005, baseG + gStep) * 100, 2),
        intrinsicValue: output.intrinsicValue,
      });
    }
  }
  return cells;
};

const buildCharts = (
  scenarios: DDMValuationResult['scenarios'],
  historical: DDMHistoricalPoint[],
  currentPrice: number,
  baseAssumptions: DDMScenarioAssumptions,
  dividendPerShare: number,
): DDMChartData => {
  const maxYears = Math.max(
    scenarios.bear.dividendProjections.length,
    scenarios.base.dividendProjections.length,
    scenarios.bull.dividendProjections.length,
  );

  const dividendProjection = Array.from({ length: maxYears }, (_, index) => ({
    year: `Y${index + 1}`,
    bear: scenarios.bear.dividendProjections[index]?.dividend ?? 0,
    base: scenarios.base.dividendProjections[index]?.dividend ?? 0,
    bull: scenarios.bull.dividendProjections[index]?.dividend ?? 0,
  }));

  return {
    dividendProjection,
    yieldTrend: historical
      .filter((h) => h.yieldPercent != null)
      .map((h) => ({ year: h.year, yieldPercent: h.yieldPercent as number })),
    scenarioComparison: [
      { label: 'Bear', intrinsicValue: scenarios.bear.intrinsicValue, currentPrice },
      { label: 'Base', intrinsicValue: scenarios.base.intrinsicValue, currentPrice },
      { label: 'Bull', intrinsicValue: scenarios.bull.intrinsicValue, currentPrice },
    ],
    sensitivityMatrix: buildSensitivityMatrix(dividendPerShare, baseAssumptions),
  };
};

export const generateDDMInsights = (
  company: DDMCompanyInputs,
  stats: DDMValuationResult['historicalStats'],
  scenarios: DDMValuationResult['scenarios'],
): string[] => {
  const insights: string[] = [];
  const base = scenarios.base;

  if (company.dividendYield > stats.averageYield && stats.averageYield > 0) {
    insights.push('Current dividend yield remains above historical averages despite stable payout ratios.');
  } else if (company.dividendYield > 0) {
    insights.push('Dividend yield screens in line with multi-year historical payout trends.');
  }

  if (Math.abs(base.upsideDownsidePercent) < 8) {
    insights.push('Base-case valuation implies the stock is broadly fairly valued on dividend fundamentals.');
  } else if (base.upsideDownsidePercent > 12) {
    insights.push('Base-case DDM implies meaningful upside versus current market price.');
  } else if (base.upsideDownsidePercent < -12) {
    insights.push('Base-case DDM suggests the market may be pricing dividends above sustainable fair value.');
  }

  const spread = scenarios.bull.intrinsicValue - scenarios.bear.intrinsicValue;
  if (spread / Math.max(scenarios.base.intrinsicValue, 1) > 0.35) {
    insights.push('Valuation remains highly sensitive to long-term dividend growth and cost of equity assumptions.');
  }

  if (stats.dividendCagr > 0) {
    insights.push(`Historical dividend CAGR of ${stats.dividendCagr.toFixed(1)}% supports base-case sustainability narrative.`);
  }

  return insights.slice(0, 4);
};

export function calculateDDMValuation(payload: DDMValuationPayload): DDMValuationResult {
  const { company, assumptions, historical } = payload;
  const dps = company.dividendPerShare;

  const bear = projectScenario(dps, company.currentPrice, assumptions.bear, 'Bear', 'bear');
  const base = projectScenario(dps, company.currentPrice, assumptions.base, 'Base', 'base');
  const bull = projectScenario(dps, company.currentPrice, assumptions.bull, 'Bull', 'bull');

  const scenarios = { bear, base, bull };
  const historicalStats = computeHistoricalStats(historical);
  const charts = buildCharts(scenarios, historical, company.currentPrice, assumptions.base, dps);
  const insights = generateDDMInsights(company, historicalStats, scenarios);

  return {
    company,
    historical,
    historicalStats,
    scenarios,
    insights,
    charts,
  };
};

const stableGordonValue = (dividendPerShare: number, dividendGrowth: number, costOfEquity: number) => {
  const g = normalizeRate(dividendGrowth);
  const r = normalizeRate(costOfEquity);
  if (r <= g) return 0;
  return (dividendPerShare * (1 + g)) / (r - g);
};

export function calculateDDM(inputs: DDMInputs): DDMResult {
  const dividendGrowth = normalizeRate(inputs.dividendGrowth);
  const costOfEquity = normalizeRate(inputs.costOfEquity);
  const forecastYears = 10;
  const dividendForecast: number[] = [];
  let dividend = inputs.dividendPerShare;

  for (let year = 1; year <= forecastYears; year += 1) {
    dividend *= 1 + dividendGrowth;
    dividendForecast.push(round(dividend, 3));
  }

  const intrinsicValue = stableGordonValue(inputs.dividendPerShare, dividendGrowth, costOfEquity);
  const scenarioSeeds = [
    { label: 'Low Growth' as const, growthRate: Math.max(0.005, dividendGrowth - 0.015) },
    { label: 'Stable Growth' as const, growthRate: dividendGrowth },
    { label: 'High Growth' as const, growthRate: dividendGrowth + 0.015 },
  ];

  const scenarios: DDMScenario[] = scenarioSeeds.map((scenario) => ({
    ...scenario,
    intrinsicValue: stableGordonValue(
      inputs.dividendPerShare,
      scenario.growthRate,
      Math.max(costOfEquity, scenario.growthRate + 0.01),
    ),
  }));

  const sensitivity = [-0.015, -0.0075, 0, 0.0075, 0.015].map((step) => {
    const adjustedCost = Math.max(0.02, costOfEquity + step);
    return {
      costOfEquity: adjustedCost,
      value: stableGordonValue(inputs.dividendPerShare, dividendGrowth, Math.max(adjustedCost, dividendGrowth + 0.01)),
    };
  });

  const summary =
    intrinsicValue > 0
      ? 'Dividend value is most sensitive to the spread between cost of equity and sustainable growth.'
      : 'Review assumptions: cost of equity must exceed growth for a stable DDM output.';

  return { intrinsicValue, dividendForecast, summary, scenarios, sensitivity };
};
