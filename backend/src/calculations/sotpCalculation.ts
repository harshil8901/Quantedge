export type SOTPScenarioKey = 'discounted' | 'base' | 'unlock';

export type SOTPValuationMethod = 'evEbitda' | 'evRevenue' | 'dcf' | 'marketValue' | 'assetValue';

export interface SOTPCompanyData {
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
  revenueGrowth: number;
  ebitdaMargin: number;
}

export interface SOTPSegment {
  id: string;
  name: string;
  revenue: number;
  ebitda: number;
  growth: number;
  multiple: number;
  valuationMethod: SOTPValuationMethod;
  marketValue?: number;
  assetValue?: number;
  dcfValue?: number;
  revenueShare?: number;
}

export interface SOTPAssumptions {
  holdcoDiscountPercent: number;
  corporateAdjustment: number;
  minorityInterest: number;
}

export interface SOTPScenarioModifiers {
  multipleFactor: number;
  holdcoDiscountPercent: number;
}

export interface SOTPSegmentValuation {
  segmentId: string;
  segmentName: string;
  valuationMethod: SOTPValuationMethod;
  impliedEnterpriseValue: number;
  multipleUsed: number;
  contributionPercent: number;
}

export interface SOTPScenarioOutput {
  label: 'Discounted Holdco' | 'Base Segments' | 'Unlock Value';
  scenarioKey: SOTPScenarioKey;
  segmentValues: SOTPSegmentValuation[];
  grossSegmentEV: number;
  holdcoDiscountPercent: number;
  holdcoDiscountAmount: number;
  adjustedEnterpriseValue: number;
  corporateAdjustment: number;
  totalEnterpriseValue: number;
  equityValue: number;
  navPerShare: number;
  marketImpliedDiscount: number;
  upsideToMarketPercent: number;
  summary: string;
  narrative: string;
}

export interface SOTPValuationPayload {
  company: SOTPCompanyData;
  segments: SOTPSegment[];
  assumptions?: SOTPAssumptions;
  scenarioModifiers?: Partial<Record<SOTPScenarioKey, Partial<SOTPScenarioModifiers>>>;
}

export interface SOTPChartData {
  segmentEvBreakdown: Array<{ segment: string; discounted: number; base: number; unlock: number }>;
  navBridge: Array<{ step: string; value: number; fill: string }>;
  segmentContribution: Array<{ segment: string; value: number; fill: string }>;
  holdcoDiscountAnalysis: Array<{ scenario: string; discount: number; nav: number }>;
  scenarioComparison: Array<{ label: string; nav: number; marketPrice: number }>;
}

export interface SOTPValuationResult {
  company: SOTPCompanyData;
  segments: SOTPSegment[];
  assumptions: SOTPAssumptions;
  scenarios: {
    discounted: SOTPScenarioOutput;
    base: SOTPScenarioOutput;
    unlock: SOTPScenarioOutput;
  };
  insights: string[];
  charts: SOTPChartData;
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

const SEGMENT_COLORS = ['#00C2FF', '#4F8CFF', '#00C896', '#F5B942', '#FF7A90', '#A78BFA', '#34D399'];

export const defaultSOTPAssumptions = (): SOTPAssumptions => ({
  holdcoDiscountPercent: 12,
  corporateAdjustment: 0,
  minorityInterest: 0,
});

export const defaultScenarioModifiers = (): Record<SOTPScenarioKey, SOTPScenarioModifiers> => ({
  discounted: { multipleFactor: 0.85, holdcoDiscountPercent: 22 },
  base: { multipleFactor: 1, holdcoDiscountPercent: 12 },
  unlock: { multipleFactor: 1.18, holdcoDiscountPercent: 5 },
});

const resolveModifiers = (
  scenarioKey: SOTPScenarioKey,
  assumptions: SOTPAssumptions,
  overrides?: SOTPValuationPayload['scenarioModifiers'],
): SOTPScenarioModifiers => {
  const defaults = defaultScenarioModifiers()[scenarioKey];
  const custom = overrides?.[scenarioKey] ?? {};
  return {
    multipleFactor: custom.multipleFactor ?? defaults.multipleFactor,
    holdcoDiscountPercent: custom.holdcoDiscountPercent ?? defaults.holdcoDiscountPercent,
  };
};

export const calculateSegmentEV = (
  segment: SOTPSegment,
  multipleFactor: number,
): { ev: number; multipleUsed: number } => {
  const adjustedMultiple = segment.multiple * multipleFactor;

  switch (segment.valuationMethod) {
    case 'evEbitda':
      return {
        ev: round(Math.max(0, segment.ebitda * adjustedMultiple), 0),
        multipleUsed: round(adjustedMultiple, 1),
      };
    case 'evRevenue':
      return {
        ev: round(Math.max(0, segment.revenue * adjustedMultiple), 0),
        multipleUsed: round(adjustedMultiple, 1),
      };
    case 'dcf':
      return {
        ev: round(Math.max(0, segment.dcfValue ?? segment.ebitda * adjustedMultiple * 1.1), 0),
        multipleUsed: round(adjustedMultiple, 1),
      };
    case 'marketValue':
      return {
        ev: round(Math.max(0, segment.marketValue ?? 0), 0),
        multipleUsed: 0,
      };
    case 'assetValue':
      return {
        ev: round(Math.max(0, segment.assetValue ?? 0), 0),
        multipleUsed: 0,
      };
    default:
      return { ev: 0, multipleUsed: 0 };
  }
};

const runScenario = (
  company: SOTPCompanyData,
  segments: SOTPSegment[],
  assumptions: SOTPAssumptions,
  scenarioKey: SOTPScenarioKey,
  modifiers: SOTPScenarioModifiers,
): SOTPScenarioOutput => {
  const segmentValues: SOTPSegmentValuation[] = segments.map((segment) => {
    const { ev, multipleUsed } = calculateSegmentEV(segment, modifiers.multipleFactor);
    return {
      segmentId: segment.id,
      segmentName: segment.name,
      valuationMethod: segment.valuationMethod,
      impliedEnterpriseValue: ev,
      multipleUsed,
      contributionPercent: 0,
    };
  });

  const grossSegmentEV = segmentValues.reduce((sum, row) => sum + row.impliedEnterpriseValue, 0);
  segmentValues.forEach((row) => {
    row.contributionPercent =
      grossSegmentEV > 0 ? round((row.impliedEnterpriseValue / grossSegmentEV) * 100, 1) : 0;
  });

  const holdcoDiscountAmount = round(grossSegmentEV * (modifiers.holdcoDiscountPercent / 100), 0);
  const adjustedEnterpriseValue = Math.max(0, grossSegmentEV - holdcoDiscountAmount);
  const totalEnterpriseValue = adjustedEnterpriseValue + assumptions.corporateAdjustment;
  const equityValue = totalEnterpriseValue + company.cash - company.debt - assumptions.minorityInterest;
  const navPerShare = company.sharesOutstanding > 0 ? equityValue / company.sharesOutstanding : 0;
  const marketImpliedDiscount =
    company.stockPrice > 0 ? ((navPerShare - company.stockPrice) / company.stockPrice) * 100 : 0;
  const upsideToMarketPercent = marketImpliedDiscount;

  const labels: Record<SOTPScenarioKey, SOTPScenarioOutput['label']> = {
    discounted: 'Discounted Holdco',
    base: 'Base Segments',
    unlock: 'Unlock Value',
  };

  const narratives: Record<SOTPScenarioKey, { summary: string; narrative: string }> = {
    discounted: {
      summary: 'Conservative segment multiples with elevated holding company discount.',
      narrative:
        'Discounted holdco case reflects conglomerate complexity, capital allocation friction, and limited strategic premium.',
    },
    base: {
      summary: 'Normalized segment valuations with institutional holdco discount.',
      narrative:
        'Base segments case applies market-aligned multiples and a balanced holding company discount to arrive at NAV.',
    },
    unlock: {
      summary: 'Premium segment re-rating with reduced holdco discount and breakup optionality.',
      narrative:
        'Unlock value case assumes spin-offs, strategic separation, and segment-level multiple expansion.',
    },
  };

  return {
    label: labels[scenarioKey],
    scenarioKey,
    segmentValues,
    grossSegmentEV: round(grossSegmentEV, 0),
    holdcoDiscountPercent: modifiers.holdcoDiscountPercent,
    holdcoDiscountAmount,
    adjustedEnterpriseValue: round(adjustedEnterpriseValue, 0),
    corporateAdjustment: assumptions.corporateAdjustment,
    totalEnterpriseValue: round(totalEnterpriseValue, 0),
    equityValue: round(equityValue, 0),
    navPerShare: round(navPerShare, 2),
    marketImpliedDiscount: round(marketImpliedDiscount, 1),
    upsideToMarketPercent: round(upsideToMarketPercent, 1),
    summary: narratives[scenarioKey].summary,
    narrative: narratives[scenarioKey].narrative,
  };
};

const buildCharts = (
  company: SOTPCompanyData,
  scenarios: SOTPValuationResult['scenarios'],
): SOTPChartData => {
  const segmentNames = scenarios.base.segmentValues.map((s) => s.segmentName);

  const segmentEvBreakdown = segmentNames.map((segment) => {
    const find = (key: SOTPScenarioKey, name: string) =>
      scenarios[key].segmentValues.find((s) => s.segmentName === name)?.impliedEnterpriseValue ?? 0;
    return {
      segment,
      discounted: find('discounted', segment),
      base: find('base', segment),
      unlock: find('unlock', segment),
    };
  });

  const base = scenarios.base;
  const navBridge = [
    { step: 'Gross Segment EV', value: base.grossSegmentEV, fill: '#00C2FF' },
    { step: 'Holdco Discount', value: -base.holdcoDiscountAmount, fill: '#FF7A90' },
    { step: 'Adjusted EV', value: base.adjustedEnterpriseValue, fill: '#4F8CFF' },
    { step: '+ Cash', value: company.cash, fill: '#00C896' },
    { step: '− Debt', value: -company.debt, fill: '#F5B942' },
    { step: 'Equity / NAV', value: base.equityValue, fill: '#A78BFA' },
  ];

  const segmentContribution = base.segmentValues.map((row, i) => ({
    segment: row.segmentName,
    value: row.impliedEnterpriseValue,
    fill: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }));

  const holdcoDiscountAnalysis = (['discounted', 'base', 'unlock'] as SOTPScenarioKey[]).map((key) => ({
    scenario: scenarios[key].label,
    discount: scenarios[key].holdcoDiscountPercent,
    nav: scenarios[key].navPerShare,
  }));

  const scenarioComparison = (['discounted', 'base', 'unlock'] as SOTPScenarioKey[]).map((key) => ({
    label: scenarios[key].label,
    nav: scenarios[key].navPerShare,
    marketPrice: company.stockPrice,
  }));

  return {
    segmentEvBreakdown,
    navBridge,
    segmentContribution,
    holdcoDiscountAnalysis,
    scenarioComparison,
  };
};

export const generateSOTPInsights = (
  company: SOTPCompanyData,
  segments: SOTPSegment[],
  scenarios: SOTPValuationResult['scenarios'],
): string[] => {
  const insights: string[] = [];
  const base = scenarios.base;
  const unlock = scenarios.unlock;

  const topSegment = [...base.segmentValues].sort(
    (a, b) => b.impliedEnterpriseValue - a.impliedEnterpriseValue,
  )[0];

  if (topSegment && topSegment.contributionPercent >= 40) {
    insights.push(
      `Core business segments (${topSegment.segmentName}) account for the majority of enterprise value generation.`,
    );
  } else {
    insights.push('Enterprise value is diversified across segments with no single dominant contributor.');
  }

  if (base.upsideToMarketPercent > 10) {
    insights.push(
      'Current market valuation implies a significant holding company discount relative to sum-of-the-parts NAV.',
    );
  } else if (base.upsideToMarketPercent < -10) {
    insights.push('Market price embeds a premium to base-case NAV, suggesting synergy or growth expectations.');
  } else {
    insights.push('Market price trades broadly in line with base-case sum-of-the-parts intrinsic value.');
  }

  if (unlock.navPerShare > base.navPerShare * 1.12) {
    insights.push(
      'Unlock-value scenario suggests upside potential from segment rerating and structural separation.',
    );
  }

  if (segments.length >= 4) {
    insights.push(
      `Multi-segment structure (${segments.length} units) supports breakup analysis and spin-off valuation debates.`,
    );
  }

  if (base.holdcoDiscountPercent >= 15) {
    insights.push(
      'Elevated holdco discount reflects capital allocation complexity and limited visibility into segment performance.',
    );
  }

  return insights.slice(0, 5);
};

export function calculateSOTPValuation(payload: SOTPValuationPayload): SOTPValuationResult {
  const { company, segments } = payload;

  if (!segments.length) {
    throw new Error('At least one business segment is required for SOTP valuation.');
  }

  const assumptions = payload.assumptions ?? defaultSOTPAssumptions();
  const scenarioKeys: SOTPScenarioKey[] = ['discounted', 'base', 'unlock'];
  const scenarios = {} as SOTPValuationResult['scenarios'];

  for (const key of scenarioKeys) {
    const modifiers = resolveModifiers(key, assumptions, payload.scenarioModifiers);
    scenarios[key] = runScenario(company, segments, assumptions, key, modifiers);
  }

  const result: SOTPValuationResult = {
    company,
    segments,
    assumptions,
    scenarios,
    insights: [],
    charts: {
      segmentEvBreakdown: [],
      navBridge: [],
      segmentContribution: [],
      holdcoDiscountAnalysis: [],
      scenarioComparison: [],
    },
  };

  result.insights = generateSOTPInsights(company, segments, scenarios);
  result.charts = buildCharts(company, scenarios);

  return result;
}
