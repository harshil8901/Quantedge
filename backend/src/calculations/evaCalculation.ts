export type EVAScenarioKey = 'efficiency' | 'base' | 'reinvestment';

export interface EVACompanyData {
  ticker: string;
  companyName: string;
  stockPrice: number;
  marketCap: number;
  enterpriseValue: number;
  revenue: number;
  ebitda: number;
  ebit: number;
  netIncome: number;
  debt: number;
  equity: number;
  cash: number;
  investedCapital: number;
  roic: number;
  revenueGrowth: number;
  ebitdaMargin: number;
}

export interface EVAAssumptions {
  taxRate: number;
  wacc: number;
  forecastYears: number;
  nopatGrowth: number;
  reinvestmentRate: number;
  capitalGrowth: number;
}

export interface EVAScenarioModifiers {
  nopatGrowth: number;
  reinvestmentRate: number;
  capitalGrowth: number;
  waccAdjustment: number;
  marginFactor: number;
}

export interface EVAProjectionRow {
  year: number;
  ebit: number;
  nopat: number;
  investedCapital: number;
  capitalCharge: number;
  eva: number;
  roic: number;
  roicSpread: number;
}

export interface EVAScenarioOutput {
  label: 'Efficiency Reset' | 'Base NOPAT' | 'Reinvestment Case';
  scenarioKey: EVAScenarioKey;
  assumptions: EVAScenarioModifiers;
  currentNopat: number;
  currentInvestedCapital: number;
  currentEva: number;
  currentRoic: number;
  currentRoicSpread: number;
  terminalEva: number;
  cumulativeEva: number;
  averageRoicSpread: number;
  valueCreation: boolean;
  projections: EVAProjectionRow[];
  summary: string;
  narrative: string;
}

export interface EVAValuationPayload {
  company: EVACompanyData;
  assumptions: EVAAssumptions;
  scenarioModifiers?: Partial<Record<EVAScenarioKey, Partial<EVAScenarioModifiers>>>;
}

export interface EVAChartData {
  roicVsWacc: Array<{ year: string; roic: number; wacc: number; spread: number }>;
  evaTrend: Array<{ year: string; efficiency: number; base: number; reinvestment: number }>;
  investedCapitalGrowth: Array<{ year: string; efficiency: number; base: number; reinvestment: number }>;
  economicProfitWaterfall: Array<{ step: string; value: number; fill: string }>;
  scenarioComparison: Array<{ label: string; eva: number; roicSpread: number; cumulativeEva: number }>;
}

export interface EVAValuationResult {
  company: EVACompanyData;
  assumptions: EVAAssumptions;
  scenarios: {
    efficiency: EVAScenarioOutput;
    base: EVAScenarioOutput;
    reinvestment: EVAScenarioOutput;
  };
  insights: string[];
  charts: EVAChartData;
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

export const defaultEVAAssumptions = (company: EVACompanyData): EVAAssumptions => ({
  taxRate: 25,
  wacc: 9.5,
  forecastYears: 5,
  nopatGrowth: Math.max(2, company.revenueGrowth * 0.5),
  reinvestmentRate: 45,
  capitalGrowth: Math.max(3, company.revenueGrowth * 0.4),
});

export const defaultScenarioModifiers = (base: EVAAssumptions): Record<EVAScenarioKey, EVAScenarioModifiers> => ({
  efficiency: {
    nopatGrowth: Math.max(0, base.nopatGrowth - 4),
    reinvestmentRate: Math.max(25, base.reinvestmentRate - 15),
    capitalGrowth: Math.max(1, base.capitalGrowth - 2),
    waccAdjustment: 1.5,
    marginFactor: 0.88,
  },
  base: {
    nopatGrowth: base.nopatGrowth,
    reinvestmentRate: base.reinvestmentRate,
    capitalGrowth: base.capitalGrowth,
    waccAdjustment: 0,
    marginFactor: 1,
  },
  reinvestment: {
    nopatGrowth: base.nopatGrowth + 5,
    reinvestmentRate: Math.min(75, base.reinvestmentRate + 15),
    capitalGrowth: base.capitalGrowth + 4,
    waccAdjustment: -0.5,
    marginFactor: 1.08,
  },
});

const resolveModifiers = (
  base: EVAAssumptions,
  scenarioKey: EVAScenarioKey,
  overrides?: EVAValuationPayload['scenarioModifiers'],
): EVAScenarioModifiers => {
  const defaults = defaultScenarioModifiers(base)[scenarioKey];
  const custom = overrides?.[scenarioKey] ?? {};
  return { ...defaults, ...custom };
};

const calculateNopat = (ebit: number, taxRate: number) => round(ebit * (1 - taxRate / 100), 0);

const buildProjections = (
  company: EVACompanyData,
  assumptions: EVAAssumptions,
  modifiers: EVAScenarioModifiers,
): EVAProjectionRow[] => {
  const wacc = assumptions.wacc + modifiers.waccAdjustment;
  const rows: EVAProjectionRow[] = [];

  let ebit = company.ebit * modifiers.marginFactor;
  let investedCapital = company.investedCapital;

  for (let year = 1; year <= assumptions.forecastYears; year++) {
    if (year > 1) {
      ebit = ebit * (1 + modifiers.nopatGrowth / 100);
      const reinvestment = calculateNopat(ebit, assumptions.taxRate) * (modifiers.reinvestmentRate / 100);
      investedCapital = investedCapital + reinvestment + investedCapital * (modifiers.capitalGrowth / 100) * 0.3;
    }

    const nopat = calculateNopat(ebit, assumptions.taxRate);
    const capitalCharge = round(investedCapital * (wacc / 100), 0);
    const eva = round(nopat - capitalCharge, 0);
    const roic = investedCapital > 0 ? round((nopat / investedCapital) * 100, 2) : 0;
    const roicSpread = round(roic - wacc, 2);

    rows.push({
      year,
      ebit: round(ebit, 0),
      nopat,
      investedCapital: round(investedCapital, 0),
      capitalCharge,
      eva,
      roic,
      roicSpread,
    });
  }

  return rows;
};

const runScenario = (
  company: EVACompanyData,
  assumptions: EVAAssumptions,
  scenarioKey: EVAScenarioKey,
  modifiers: EVAScenarioModifiers,
): EVAScenarioOutput => {
  const wacc = assumptions.wacc + modifiers.waccAdjustment;
  const baseEbit = company.ebit * modifiers.marginFactor;
  const currentNopat = calculateNopat(baseEbit, assumptions.taxRate);
  const currentInvestedCapital = company.investedCapital;
  const capitalCharge = round(currentInvestedCapital * (wacc / 100), 0);
  const currentEva = round(currentNopat - capitalCharge, 0);
  const currentRoic = currentInvestedCapital > 0 ? round((currentNopat / currentInvestedCapital) * 100, 2) : 0;
  const currentRoicSpread = round(currentRoic - wacc, 2);

  const projections = buildProjections(company, assumptions, modifiers);
  const terminalEva = projections[projections.length - 1]?.eva ?? currentEva;
  const cumulativeEva = round(
    projections.reduce((sum, row) => sum + row.eva, 0),
    0,
  );
  const averageRoicSpread = round(
    projections.reduce((sum, row) => sum + row.roicSpread, 0) / projections.length,
    2,
  );

  const labels: Record<EVAScenarioKey, EVAScenarioOutput['label']> = {
    efficiency: 'Efficiency Reset',
    base: 'Base NOPAT',
    reinvestment: 'Reinvestment Case',
  };

  const narratives: Record<EVAScenarioKey, { summary: string; narrative: string }> = {
    efficiency: {
      summary: 'Conservative margins and weaker reinvestment efficiency compress economic profit.',
      narrative:
        'Efficiency reset reflects margin normalization, elevated capital intensity, and limited incremental EVA generation.',
    },
    base: {
      summary: 'Sustainable NOPAT and balanced reinvestment support steady economic profit.',
      narrative:
        'Base case assumes normalized profitability with capital returns aligned to institutional WACC assumptions.',
    },
    reinvestment: {
      summary: 'Aggressive reinvestment and ROIC expansion drive premium EVA generation.',
      narrative:
        'Reinvestment case captures operating leverage, capital efficiency gains, and sustained value creation above WACC.',
    },
  };

  return {
    label: labels[scenarioKey],
    scenarioKey,
    assumptions: modifiers,
    currentNopat,
    currentInvestedCapital,
    currentEva,
    currentRoic,
    currentRoicSpread,
    terminalEva,
    cumulativeEva,
    averageRoicSpread,
    valueCreation: averageRoicSpread > 0,
    projections,
    summary: narratives[scenarioKey].summary,
    narrative: narratives[scenarioKey].narrative,
  };
};

const buildCharts = (
  assumptions: EVAAssumptions,
  scenarios: EVAValuationResult['scenarios'],
): EVAChartData => {
  const base = scenarios.base;
  const years = base.projections.map((p) => String(p.year));

  const roicVsWacc = base.projections.map((row) => ({
    year: String(row.year),
    roic: row.roic,
    wacc: assumptions.wacc,
    spread: row.roicSpread,
  }));

  const evaTrend = years.map((year, i) => ({
    year,
    efficiency: scenarios.efficiency.projections[i]?.eva ?? 0,
    base: scenarios.base.projections[i]?.eva ?? 0,
    reinvestment: scenarios.reinvestment.projections[i]?.eva ?? 0,
  }));

  const investedCapitalGrowth = years.map((year, i) => ({
    year,
    efficiency: scenarios.efficiency.projections[i]?.investedCapital ?? 0,
    base: scenarios.base.projections[i]?.investedCapital ?? 0,
    reinvestment: scenarios.reinvestment.projections[i]?.investedCapital ?? 0,
  }));

  const economicProfitWaterfall = [
    { step: 'NOPAT', value: base.currentNopat, fill: '#00E5A8' },
    { step: 'Capital Charge', value: -round(base.currentInvestedCapital * (assumptions.wacc / 100), 0), fill: '#FF7A90' },
    { step: 'EVA', value: base.currentEva, fill: '#4F8CFF' },
  ];

  const scenarioComparison = (['efficiency', 'base', 'reinvestment'] as EVAScenarioKey[]).map((key) => ({
    label: scenarios[key].label,
    eva: scenarios[key].currentEva,
    roicSpread: scenarios[key].currentRoicSpread,
    cumulativeEva: scenarios[key].cumulativeEva,
  }));

  return {
    roicVsWacc,
    evaTrend,
    investedCapitalGrowth,
    economicProfitWaterfall,
    scenarioComparison,
  };
};

export const generateEVAInsights = (
  company: EVACompanyData,
  assumptions: EVAAssumptions,
  scenarios: EVAValuationResult['scenarios'],
): string[] => {
  const insights: string[] = [];
  const base = scenarios.base;
  const reinvestment = scenarios.reinvestment;
  const efficiency = scenarios.efficiency;

  if (base.averageRoicSpread > 0) {
    insights.push('ROIC remains above WACC across forecast periods, supporting continued value creation.');
  } else {
    insights.push('ROIC trails WACC on average, indicating economic profit erosion and value destruction risk.');
  }

  if (efficiency.cumulativeEva < base.cumulativeEva * 0.7) {
    insights.push('Capital intensity limits incremental EVA generation in downside efficiency scenarios.');
  }

  if (reinvestment.cumulativeEva > base.cumulativeEva * 1.25) {
    insights.push('Reinvestment assumptions significantly impact long-term economic profit expansion.');
  }

  if (company.roic > assumptions.wacc) {
    insights.push(
      `Current ROIC (${company.roic.toFixed(1)}%) exceeds WACC (${assumptions.wacc}%), confirming positive economic profit at entry.`,
    );
  }

  if (reinvestment.terminalEva > base.terminalEva * 1.3) {
    insights.push('Terminal-year EVA in the reinvestment case implies meaningful operating leverage and capital efficiency gains.');
  }

  return insights.slice(0, 5);
};

export function calculateEVAValuation(payload: EVAValuationPayload): EVAValuationResult {
  const { company, assumptions } = payload;

  if (company.investedCapital <= 0) {
    throw new Error('Invested capital must be positive for EVA analysis.');
  }
  if (company.ebit <= 0) {
    throw new Error('EBIT must be positive for NOPAT-based EVA valuation.');
  }

  const scenarioKeys: EVAScenarioKey[] = ['efficiency', 'base', 'reinvestment'];
  const scenarios = {} as EVAValuationResult['scenarios'];

  for (const key of scenarioKeys) {
    const modifiers = resolveModifiers(assumptions, key, payload.scenarioModifiers);
    scenarios[key] = runScenario(company, assumptions, key, modifiers);
  }

  const result: EVAValuationResult = {
    company,
    assumptions,
    scenarios,
    insights: [],
    charts: {
      roicVsWacc: [],
      evaTrend: [],
      investedCapitalGrowth: [],
      economicProfitWaterfall: [],
      scenarioComparison: [],
    },
  };

  result.insights = generateEVAInsights(company, assumptions, scenarios);
  result.charts = buildCharts(assumptions, scenarios);

  return result;
}
