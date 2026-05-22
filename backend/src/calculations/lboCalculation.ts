export type LBOScenarioKey = 'downside' | 'base' | 'upside';

export interface LBOCompanyData {
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
  ebitdaMargin: number;
  revenueGrowth: number;
}

export interface LBOAssumptions {
  entryMultiple: number;
  exitMultiple: number;
  debtPercent: number;
  equityPercent: number;
  interestRate: number;
  ebitdaGrowth: number;
  holdingPeriod: number;
  debtRepaymentPercent: number;
  seniorDebtShare: number;
  subordinatedDebtShare: number;
}

export interface LBOScenarioAssumptions {
  exitMultiple: number;
  ebitdaGrowth: number;
  debtRepaymentPercent: number;
}

export interface LBODebtScheduleRow {
  year: number;
  ebitda: number;
  beginningDebt: number;
  interestExpense: number;
  principalPaydown: number;
  endingDebt: number;
  leverageRatio: number;
}

export interface LBOScenarioOutput {
  label: 'Downside Exit' | 'Base Exit' | 'Upside Exit';
  scenarioKey: LBOScenarioKey;
  assumptions: LBOScenarioAssumptions;
  entryEnterpriseValue: number;
  exitEnterpriseValue: number;
  exitEbitda: number;
  initialSponsorEquity: number;
  exitSponsorEquity: number;
  totalDebtPaydown: number;
  remainingDebt: number;
  moic: number;
  irr: number;
  leverageAtEntry: number;
  leverageAtExit: number;
  summary: string;
  narrative: string;
}

export interface LBOValuationPayload {
  company: LBOCompanyData;
  assumptions: LBOAssumptions;
  scenarioOverrides?: Partial<Record<LBOScenarioKey, Partial<LBOScenarioAssumptions>>>;
}

export interface LBOChartData {
  debtPaydownSchedule: Array<{
    year: string;
    downside: number;
    base: number;
    upside: number;
  }>;
  irrSensitivity: Array<{ exitMultiple: string; downside: number; base: number; upside: number }>;
  exitMultipleSensitivity: Array<{ label: string; irr: number; moic: number }>;
  sponsorEquityGrowth: Array<{
    year: string;
    downside: number;
    base: number;
    upside: number;
  }>;
  capitalStructure: Array<{ segment: string; value: number; fill: string }>;
}

export interface LBOValuationResult {
  company: LBOCompanyData;
  assumptions: LBOAssumptions;
  acquisition: {
    entryEnterpriseValue: number;
    totalDebt: number;
    seniorDebt: number;
    subordinatedDebt: number;
    sponsorEquity: number;
    leverageRatio: number;
  };
  scenarios: {
    downside: LBOScenarioOutput;
    base: LBOScenarioOutput;
    upside: LBOScenarioOutput;
  };
  insights: string[];
  charts: LBOChartData;
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

export const defaultLBOAssumptions = (company: LBOCompanyData): LBOAssumptions => ({
  entryMultiple: 10,
  exitMultiple: 11,
  debtPercent: 60,
  equityPercent: 40,
  interestRate: 7.5,
  ebitdaGrowth: Math.max(3, company.revenueGrowth * 0.6),
  holdingPeriod: 5,
  debtRepaymentPercent: 45,
  seniorDebtShare: 70,
  subordinatedDebtShare: 30,
});

export const defaultScenarioOverrides = (base: LBOAssumptions): Record<LBOScenarioKey, LBOScenarioAssumptions> => ({
  downside: {
    exitMultiple: round(base.exitMultiple * 0.85, 1),
    ebitdaGrowth: round(Math.max(0, base.ebitdaGrowth - 3), 1),
    debtRepaymentPercent: round(Math.max(25, base.debtRepaymentPercent - 10), 1),
  },
  base: {
    exitMultiple: base.exitMultiple,
    ebitdaGrowth: base.ebitdaGrowth,
    debtRepaymentPercent: base.debtRepaymentPercent,
  },
  upside: {
    exitMultiple: round(base.exitMultiple * 1.15, 1),
    ebitdaGrowth: round(base.ebitdaGrowth + 3, 1),
    debtRepaymentPercent: round(Math.min(65, base.debtRepaymentPercent + 10), 1),
  },
});

const resolveScenarioAssumptions = (
  base: LBOAssumptions,
  scenarioKey: LBOScenarioKey,
  overrides?: LBOValuationPayload['scenarioOverrides'],
): LBOScenarioAssumptions => {
  const defaults = defaultScenarioOverrides(base)[scenarioKey];
  const custom = overrides?.[scenarioKey] ?? {};
  return {
    exitMultiple: custom.exitMultiple ?? defaults.exitMultiple,
    ebitdaGrowth: custom.ebitdaGrowth ?? defaults.ebitdaGrowth,
    debtRepaymentPercent: custom.debtRepaymentPercent ?? defaults.debtRepaymentPercent,
  };
};

const buildDebtSchedule = (
  entryEbitda: number,
  entryDebt: number,
  interestRate: number,
  ebitdaGrowth: number,
  debtRepaymentPercent: number,
  holdingPeriod: number,
): LBODebtScheduleRow[] => {
  const schedule: LBODebtScheduleRow[] = [];
  let debt = entryDebt;
  let ebitda = entryEbitda;

  for (let year = 1; year <= holdingPeriod; year++) {
    ebitda = ebitda * (1 + ebitdaGrowth / 100);
    const beginningDebt = debt;
    const interestExpense = beginningDebt * (interestRate / 100);
    const cashForDebt = ebitda * (debtRepaymentPercent / 100);
    const principalPaydown = Math.min(beginningDebt, Math.max(0, cashForDebt - interestExpense));
    const endingDebt = Math.max(0, beginningDebt - principalPaydown);
    const leverageRatio = ebitda > 0 ? endingDebt / ebitda : 0;

    schedule.push({
      year,
      ebitda: round(ebitda, 0),
      beginningDebt: round(beginningDebt, 0),
      interestExpense: round(interestExpense, 0),
      principalPaydown: round(principalPaydown, 0),
      endingDebt: round(endingDebt, 0),
      leverageRatio: round(leverageRatio, 2),
    });

    debt = endingDebt;
  }

  return schedule;
};

const calculateIRR = (cashFlows: number[]): number => {
  if (!cashFlows.length || cashFlows[0] >= 0) return 0;

  const npv = (rate: number) =>
    cashFlows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, i), 0);

  let low = -0.99;
  let high = 5;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const value = npv(mid);
    if (value > 0) low = mid;
    else high = mid;
  }
  return round(((low + high) / 2) * 100, 1);
};

const runScenario = (
  company: LBOCompanyData,
  baseAssumptions: LBOAssumptions,
  scenarioKey: LBOScenarioKey,
  scenarioAssumptions: LBOScenarioAssumptions,
): LBOScenarioOutput => {
  const entryEV = company.ebitda * baseAssumptions.entryMultiple;
  const totalDebt = entryEV * (baseAssumptions.debtPercent / 100);
  const sponsorEquity = entryEV * (baseAssumptions.equityPercent / 100);
  const leverageAtEntry = company.ebitda > 0 ? totalDebt / company.ebitda : 0;

  const schedule = buildDebtSchedule(
    company.ebitda,
    totalDebt,
    baseAssumptions.interestRate,
    scenarioAssumptions.ebitdaGrowth,
    scenarioAssumptions.debtRepaymentPercent,
    baseAssumptions.holdingPeriod,
  );

  const finalRow = schedule[schedule.length - 1];
  const exitEbitda = finalRow?.ebitda ?? company.ebitda;
  const remainingDebt = finalRow?.endingDebt ?? totalDebt;
  const totalDebtPaydown = totalDebt - remainingDebt;
  const exitEV = exitEbitda * scenarioAssumptions.exitMultiple;
  const exitSponsorEquity = exitEV - remainingDebt;
  const moic = sponsorEquity > 0 ? exitSponsorEquity / sponsorEquity : 0;

  const cashFlows = [-sponsorEquity, ...Array(baseAssumptions.holdingPeriod - 1).fill(0), exitSponsorEquity];
  const irr = calculateIRR(cashFlows);
  const leverageAtExit = exitEbitda > 0 ? remainingDebt / exitEbitda : 0;

  const labels: Record<LBOScenarioKey, LBOScenarioOutput['label']> = {
    downside: 'Downside Exit',
    base: 'Base Exit',
    upside: 'Upside Exit',
  };

  const narratives: Record<LBOScenarioKey, { summary: string; narrative: string }> = {
    downside: {
      summary: 'Stressed exit multiple and slower deleveraging compress sponsor returns below hurdle.',
      narrative: 'Weaker EBITDA growth and constrained cash sweep limit debt paydown contribution to equity value.',
    },
    base: {
      summary: 'Normalized growth and stable exit multiple support institutional hurdle-rate returns.',
      narrative: 'Balanced capital structure with moderate deleveraging drives sponsor MOIC through operating and financial engineering.',
    },
    upside: {
      summary: 'Premium exit multiple and accelerated paydown drive top-quartile sponsor performance.',
      narrative: 'Strong EBITDA expansion and faster deleveraging amplify equity value creation at exit.',
    },
  };

  return {
    label: labels[scenarioKey],
    scenarioKey,
    assumptions: scenarioAssumptions,
    entryEnterpriseValue: round(entryEV, 0),
    exitEnterpriseValue: round(exitEV, 0),
    exitEbitda: round(exitEbitda, 0),
    initialSponsorEquity: round(sponsorEquity, 0),
    exitSponsorEquity: round(exitSponsorEquity, 0),
    totalDebtPaydown: round(totalDebtPaydown, 0),
    remainingDebt: round(remainingDebt, 0),
    moic: round(moic, 2),
    irr,
    leverageAtEntry: round(leverageAtEntry, 2),
    leverageAtExit: round(leverageAtExit, 2),
    summary: narratives[scenarioKey].summary,
    narrative: narratives[scenarioKey].narrative,
  };
};

const buildCharts = (
  company: LBOCompanyData,
  assumptions: LBOAssumptions,
  scenarios: LBOValuationResult['scenarios'],
  acquisition: LBOValuationResult['acquisition'],
): LBOChartData => {
  const years = Array.from({ length: assumptions.holdingPeriod }, (_, i) => String(i + 1));

  const buildScheduleDebt = (scenarioKey: LBOScenarioKey) => {
    const scenario = scenarios[scenarioKey];
    const schedule = buildDebtSchedule(
      company.ebitda,
      acquisition.totalDebt,
      assumptions.interestRate,
      scenario.assumptions.ebitdaGrowth,
      scenario.assumptions.debtRepaymentPercent,
      assumptions.holdingPeriod,
    );
    return schedule.map((row) => row.endingDebt);
  };

  const downsideDebt = buildScheduleDebt('downside');
  const baseDebt = buildScheduleDebt('base');
  const upsideDebt = buildScheduleDebt('upside');

  const debtPaydownSchedule = years.map((year, i) => ({
    year,
    downside: downsideDebt[i] ?? 0,
    base: baseDebt[i] ?? 0,
    upside: upsideDebt[i] ?? 0,
  }));

  const exitMultiples = [
    assumptions.exitMultiple * 0.8,
    assumptions.exitMultiple * 0.9,
    assumptions.exitMultiple,
    assumptions.exitMultiple * 1.1,
    assumptions.exitMultiple * 1.2,
  ];

  const irrSensitivity = exitMultiples.map((multiple) => {
    const label = `${round(multiple, 1)}x`;
    const runIrr = (key: LBOScenarioKey) => {
      const scenario = runScenario(company, assumptions, key, {
        ...scenarios[key].assumptions,
        exitMultiple: round(multiple, 1),
      });
      return scenario.irr;
    };
    return {
      exitMultiple: label,
      downside: runIrr('downside'),
      base: runIrr('base'),
      upside: runIrr('upside'),
    };
  });

  const exitMultipleSensitivity = (['downside', 'base', 'upside'] as LBOScenarioKey[]).map((key) => ({
    label: scenarios[key].label,
    irr: scenarios[key].irr,
    moic: scenarios[key].moic,
  }));

  const sponsorEquityGrowth = years.map((year, i) => {
    const progress = (i + 1) / assumptions.holdingPeriod;
    return {
      year,
      downside: round(scenarios.downside.initialSponsorEquity * (1 + (scenarios.downside.moic - 1) * progress), 0),
      base: round(scenarios.base.initialSponsorEquity * (1 + (scenarios.base.moic - 1) * progress), 0),
      upside: round(scenarios.upside.initialSponsorEquity * (1 + (scenarios.upside.moic - 1) * progress), 0),
    };
  });

  const capitalStructure = [
    { segment: 'Senior Debt', value: acquisition.seniorDebt, fill: '#7C5CFF' },
    { segment: 'Subordinated Debt', value: acquisition.subordinatedDebt, fill: '#5B8DEF' },
    { segment: 'Sponsor Equity', value: acquisition.sponsorEquity, fill: '#00C896' },
  ];

  return {
    debtPaydownSchedule,
    irrSensitivity,
    exitMultipleSensitivity,
    sponsorEquityGrowth,
    capitalStructure,
  };
};

export const generateLBOInsights = (
  scenarios: LBOValuationResult['scenarios'],
  assumptions: LBOAssumptions,
): string[] => {
  const insights: string[] = [];
  const base = scenarios.base;
  const upside = scenarios.upside;
  const downside = scenarios.downside;

  if (base.irr >= 20) {
    insights.push('Base-case sponsor returns remain above institutional hurdle rates.');
  } else if (base.irr >= 15) {
    insights.push('Base-case IRR approaches sponsor hurdle with limited margin for underwriting error.');
  } else {
    insights.push('Base-case returns sit below typical sponsor hurdle rates, requiring structure or growth revision.');
  }

  if (upside.irr - base.irr >= 8) {
    insights.push('Upside valuation remains highly sensitive to exit multiple expansion and EBITDA outperformance.');
  }

  if (base.totalDebtPaydown > base.initialSponsorEquity * 0.5) {
    insights.push('Debt paydown contributes significantly to sponsor equity value creation through deleveraging.');
  }

  if (downside.moic < 1.5) {
    insights.push('Downside case implies stressed returns, highlighting refinancing and operational risk in the capital structure.');
  }

  if (assumptions.debtPercent >= 65) {
    insights.push('Elevated leverage at entry amplifies return sensitivity to interest rates and cash flow volatility.');
  }

  if (upside.leverageAtExit < base.leverageAtEntry * 0.5) {
    insights.push('Upside path achieves meaningful deleveraging, supporting multiple expansion at exit.');
  }

  return insights.slice(0, 5);
};

export function calculateLBOValuation(payload: LBOValuationPayload): LBOValuationResult {
  const { company, assumptions } = payload;

  if (company.ebitda <= 0) {
    throw new Error('EBITDA must be positive for LBO underwriting.');
  }
  if (assumptions.holdingPeriod < 3 || assumptions.holdingPeriod > 10) {
    throw new Error('Holding period should be between 3 and 10 years.');
  }
  if (Math.abs(assumptions.debtPercent + assumptions.equityPercent - 100) > 1) {
    throw new Error('Debt % and equity % should sum to approximately 100%.');
  }

  const entryEV = company.ebitda * assumptions.entryMultiple;
  const totalDebt = entryEV * (assumptions.debtPercent / 100);
  const sponsorEquity = entryEV * (assumptions.equityPercent / 100);
  const seniorDebt = totalDebt * (assumptions.seniorDebtShare / 100);
  const subordinatedDebt = totalDebt * (assumptions.subordinatedDebtShare / 100);

  const acquisition = {
    entryEnterpriseValue: round(entryEV, 0),
    totalDebt: round(totalDebt, 0),
    seniorDebt: round(seniorDebt, 0),
    subordinatedDebt: round(subordinatedDebt, 0),
    sponsorEquity: round(sponsorEquity, 0),
    leverageRatio: round(company.ebitda > 0 ? totalDebt / company.ebitda : 0, 2),
  };

  const scenarioKeys: LBOScenarioKey[] = ['downside', 'base', 'upside'];
  const scenarios = {} as LBOValuationResult['scenarios'];

  for (const key of scenarioKeys) {
    const scenarioAssumptions = resolveScenarioAssumptions(assumptions, key, payload.scenarioOverrides);
    scenarios[key] = runScenario(company, assumptions, key, scenarioAssumptions);
  }

  const result: LBOValuationResult = {
    company,
    assumptions,
    acquisition,
    scenarios,
    insights: [],
    charts: { debtPaydownSchedule: [], irrSensitivity: [], exitMultipleSensitivity: [], sponsorEquityGrowth: [], capitalStructure: [] },
  };

  result.insights = generateLBOInsights(scenarios, assumptions);
  result.charts = buildCharts(company, assumptions, scenarios, acquisition);

  return result;
}
