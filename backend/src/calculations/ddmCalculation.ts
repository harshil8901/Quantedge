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

const normaliseRate = (value: number) => (Math.abs(value) > 1 ? value / 100 : value);

const stableValue = (dividendPerShare: number, dividendGrowth: number, costOfEquity: number) => {
  if (costOfEquity <= dividendGrowth) return 0;
  return (dividendPerShare * (1 + dividendGrowth)) / (costOfEquity - dividendGrowth);
};

export function calculateDDM(inputs: DDMInputs): DDMResult {
  const dividendGrowth = normaliseRate(inputs.dividendGrowth);
  const costOfEquity = normaliseRate(inputs.costOfEquity);
  const forecastYears = 10;
  const dividendForecast: number[] = [];
  let dividend = inputs.dividendPerShare;

  for (let year = 1; year <= forecastYears; year += 1) {
    dividend *= 1 + dividendGrowth;
    dividendForecast.push(dividend);
  }

  const intrinsicValue = stableValue(inputs.dividendPerShare, dividendGrowth, costOfEquity);
  const scenarioSeeds = [
    { label: 'Low Growth', growthRate: Math.max(0.005, dividendGrowth - 0.015), intrinsicValue: 0 },
    { label: 'Stable Growth', growthRate: dividendGrowth, intrinsicValue: 0 },
    { label: 'High Growth', growthRate: dividendGrowth + 0.015, intrinsicValue: 0 },
  ] as const;

  const scenarios: DDMScenario[] = scenarioSeeds.map((scenario) => ({
    ...scenario,
    intrinsicValue: stableValue(inputs.dividendPerShare, scenario.growthRate, Math.max(costOfEquity, scenario.growthRate + 0.01)),
  }));

  const sensitivity = [-0.015, -0.0075, 0, 0.0075, 0.015].map((step) => {
    const adjustedCost = Math.max(0.02, costOfEquity + step);

    return {
      costOfEquity: adjustedCost,
      value: stableValue(inputs.dividendPerShare, dividendGrowth, Math.max(adjustedCost, dividendGrowth + 0.01)),
    };
  });

  const summary =
    intrinsicValue > 0
      ? 'Dividend value is most sensitive to the spread between cost of equity and sustainable growth.'
      : 'Review assumptions: cost of equity must exceed growth for a stable DDM output.';

  return {
    intrinsicValue,
    dividendForecast,
    summary,
    scenarios,
    sensitivity,
  };
}
