export type ScenarioKey = 'bear' | 'base' | 'bull';

export interface DCFCompanyInputs {
  companyName?: string;
  ticker: string;
  currentPrice: number;
  sharesOutstanding: number;
  revenue: number;
  ebitda: number;
  ebit: number;
  cash: number;
  debt: number;
  freeCashFlow: number;
  capex: number;
  depreciationAndAmortization: number;
  workingCapital: number;
  historicalRevenueGrowth: number;
  historicalEbitdaMargin: number;
  historicalEbitMargin: number;
  historicalFcfMargin: number;
}

export interface DCFScenarioAssumptions {
  revenueGrowth: number;
  ebitdaMargin: number;
  ebitMargin: number;
  wacc: number;
  terminalGrowth: number;
  taxRate: number;
  capexPercent: number;
  workingCapitalPercent: number;
}

export interface DCFProjectionPoint {
  year: number;
  revenue: number;
  ebitda: number;
  ebit: number;
  freeCashFlow: number;
  discountedCashFlow: number;
}

export interface DCFScenarioOutput {
  caseKey: ScenarioKey;
  label: string;
  enterpriseValue: number;
  equityValue: number;
  intrinsicValuePerShare: number;
  marginOfSafety: number;
  upsideDownsidePercent: number;
  terminalValue: number;
  discountedTerminalValue: number;
  terminalValueContributionPercent: number;
  projection: DCFProjectionPoint[];
}

export interface DCFSensitivityCell {
  terminalGrowth: number;
  intrinsicValuePerShare: number;
}

export interface DCFSensitivityRow {
  wacc: number;
  values: DCFSensitivityCell[];
}

export interface DCFWorkflowResult {
  ticker: string;
  companyName?: string;
  currentPrice: number;
  bearCase: DCFScenarioOutput;
  baseCase: DCFScenarioOutput;
  bullCase: DCFScenarioOutput;
  sensitivity: DCFSensitivityRow[];
  aiInsights: string[];
}

const normalizeRate = (value: number) => (Math.abs(value) > 1 ? value / 100 : value);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeScenario = (scenario: DCFScenarioAssumptions): DCFScenarioAssumptions => ({
  revenueGrowth: normalizeRate(scenario.revenueGrowth),
  ebitdaMargin: normalizeRate(scenario.ebitdaMargin),
  ebitMargin: normalizeRate(scenario.ebitMargin),
  wacc: normalizeRate(scenario.wacc),
  terminalGrowth: normalizeRate(scenario.terminalGrowth),
  taxRate: normalizeRate(scenario.taxRate),
  capexPercent: normalizeRate(scenario.capexPercent),
  workingCapitalPercent: normalizeRate(scenario.workingCapitalPercent),
});

const runScenario = (company: DCFCompanyInputs, caseKey: ScenarioKey, assumptions: DCFScenarioAssumptions): DCFScenarioOutput => {
  const safeWacc = Math.max(normalizeRate(assumptions.wacc), normalizeRate(assumptions.terminalGrowth) + 0.01);
  const terminalGrowth = Math.min(normalizeRate(assumptions.terminalGrowth), safeWacc - 0.005);
  const taxRate = clamp(normalizeRate(assumptions.taxRate), 0, 0.5);
  const revenueGrowth = normalizeRate(assumptions.revenueGrowth);
  const ebitMargin = clamp(normalizeRate(assumptions.ebitMargin), 0.01, 0.8);
  const ebitdaMargin = clamp(normalizeRate(assumptions.ebitdaMargin), ebitMargin, 0.9);
  const capexPercent = Math.max(0, normalizeRate(assumptions.capexPercent));
  const workingCapitalPercent = Math.max(0, normalizeRate(assumptions.workingCapitalPercent));
  const sharesOutstanding = Math.max(company.sharesOutstanding, 1);

  const projection: DCFProjectionPoint[] = [];
  let revenue = Math.max(company.revenue, 0);
  let discountedFcfSum = 0;

  for (let year = 1; year <= 10; year += 1) {
    const fade = (year - 1) / 9;
    const growth = revenueGrowth * (1 - fade * 0.5) + terminalGrowth * (fade * 0.5);
    revenue *= 1 + growth;

    const ebitda = revenue * ebitdaMargin;
    const ebit = revenue * ebitMargin;
    const depreciationAndAmortization = Math.max(0, ebitda - ebit);
    const capex = revenue * capexPercent;
    const workingCapitalChange = revenue * workingCapitalPercent;
    const freeCashFlow = ebit * (1 - taxRate) + depreciationAndAmortization - capex - workingCapitalChange;
    const discountedCashFlow = freeCashFlow / Math.pow(1 + safeWacc, year);

    discountedFcfSum += discountedCashFlow;
    projection.push({ year, revenue, ebitda, ebit, freeCashFlow, discountedCashFlow });
  }

  const terminalFcf = (projection[projection.length - 1]?.freeCashFlow ?? 0) * (1 + terminalGrowth);
  const terminalValue = terminalFcf / Math.max(safeWacc - terminalGrowth, 0.001);
  const discountedTerminalValue = terminalValue / Math.pow(1 + safeWacc, 10);
  const enterpriseValue = discountedFcfSum + discountedTerminalValue;
  const equityValue = enterpriseValue + company.cash - company.debt;
  const intrinsicValuePerShare = equityValue / sharesOutstanding;
  const upsideDownsidePercent = company.currentPrice > 0 ? ((intrinsicValuePerShare - company.currentPrice) / company.currentPrice) * 100 : 0;
  const marginOfSafety = company.currentPrice > 0 ? ((intrinsicValuePerShare - company.currentPrice) / intrinsicValuePerShare) * 100 : 0;
  const terminalValueContributionPercent = enterpriseValue > 0 ? (discountedTerminalValue / enterpriseValue) * 100 : 0;

  return {
    caseKey,
    label: caseKey === 'bear' ? 'Bear Case' : caseKey === 'bull' ? 'Bull Case' : 'Base Case',
    enterpriseValue,
    equityValue,
    intrinsicValuePerShare,
    marginOfSafety,
    upsideDownsidePercent,
    terminalValue,
    discountedTerminalValue,
    terminalValueContributionPercent,
    projection,
  };
};

export const calculateDCFWorkflow = (
  companyInputs: DCFCompanyInputs,
  scenarioInputs: Record<ScenarioKey, DCFScenarioAssumptions>,
): DCFWorkflowResult => {
  const bear = runScenario(companyInputs, 'bear', normalizeScenario(scenarioInputs.bear));
  const base = runScenario(companyInputs, 'base', normalizeScenario(scenarioInputs.base));
  const bull = runScenario(companyInputs, 'bull', normalizeScenario(scenarioInputs.bull));

  const baseScenario = normalizeScenario(scenarioInputs.base);
  const waccSteps = [-0.01, -0.005, 0, 0.005, 0.01];
  const tgSteps = [-0.01, -0.005, 0, 0.005, 0.01];
  const sensitivity = waccSteps.map((waccStep) => {
    const wacc = Math.max(0.05, normalizeRate(baseScenario.wacc) + waccStep);
    return {
      wacc,
      values: tgSteps.map((tgStep) => {
        const terminalGrowth = Math.max(0.01, Math.min(wacc - 0.005, normalizeRate(baseScenario.terminalGrowth) + tgStep));
        const scenario = runScenario(companyInputs, 'base', { ...baseScenario, wacc, terminalGrowth });
        return {
          terminalGrowth,
          intrinsicValuePerShare: scenario.intrinsicValuePerShare,
        };
      }),
    };
  });

  const aiInsights = [
    `Terminal value contributes ${base.terminalValueContributionPercent.toFixed(1)}% of base-case enterprise value, increasing long-duration assumption sensitivity.`,
    `Base-case intrinsic value implies ${base.upsideDownsidePercent.toFixed(1)}% versus current market price, while bear-case still prices ${bear.upsideDownsidePercent.toFixed(1)}%.`,
    `Scenario spread between bear and bull outcomes is ${(bull.intrinsicValuePerShare - bear.intrinsicValuePerShare).toFixed(2)} per share, highlighting conviction risk around growth and WACC.`,
  ];

  return {
    ticker: companyInputs.ticker,
    companyName: companyInputs.companyName,
    currentPrice: companyInputs.currentPrice,
    bearCase: bear,
    baseCase: base,
    bullCase: bull,
    sensitivity,
    aiInsights,
  };
};
