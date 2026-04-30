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
  valuationRange: {
    low: number;
    high: number;
  };
  scenarios: CompsScenario[];
  peerComparison: Array<{ peer: string; multiple: number }>;
  multipleDistribution: Array<{ bucket: string; count: number }>;
}

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

export function calculateComps(inputs: CompsInputs): CompsResult {
  const { revenue, ebitda, netIncome, sharePrice, enterpriseValue, peerMultiple } = inputs;
  const sharesOutstanding = inputs.sharesOutstanding || 1;
  const peerMultiples = inputs.peerMultiples?.length ? inputs.peerMultiples : [peerMultiple * 0.82, peerMultiple * 0.94, peerMultiple, peerMultiple * 1.08, peerMultiple * 1.18].filter(Boolean);
  const baseMultiple = average(peerMultiples) || peerMultiple || 0;

  const evEbitda = ebitda > 0 ? enterpriseValue / ebitda : 0;
  const marketCap = sharePrice * sharesOutstanding;
  const pe = netIncome > 0 ? marketCap / netIncome : 0;
  const evSales = revenue > 0 ? enterpriseValue / revenue : 0;

  const scenarioSeeds = [
    { label: 'Conservative', multiple: baseMultiple * 0.85, impliedEnterpriseValue: 0, impliedSharePrice: 0 },
    { label: 'Base', multiple: baseMultiple, impliedEnterpriseValue: 0, impliedSharePrice: 0 },
    { label: 'Premium', multiple: baseMultiple * 1.15, impliedEnterpriseValue: 0, impliedSharePrice: 0 },
  ] as const;

  const scenarioMultiples: CompsScenario[] = scenarioSeeds.map((scenario) => {
    const impliedEnterpriseValue = ebitda * scenario.multiple;

    return {
      ...scenario,
      impliedEnterpriseValue,
      impliedSharePrice: sharesOutstanding > 0 ? impliedEnterpriseValue / sharesOutstanding : 0,
    };
  });

  const impliedEnterpriseValue = scenarioMultiples[1].impliedEnterpriseValue;
  const impliedSharePrice = scenarioMultiples[1].impliedSharePrice;

  return {
    evEbitda,
    pe,
    evSales,
    impliedValuation: impliedEnterpriseValue,
    impliedEnterpriseValue,
    impliedSharePrice,
    valuationRange: {
      low: scenarioMultiples[0].impliedSharePrice,
      high: scenarioMultiples[2].impliedSharePrice,
    },
    scenarios: scenarioMultiples,
    peerComparison: peerMultiples.map((multiple, index) => ({ peer: `Peer ${index + 1}`, multiple })),
    multipleDistribution: [
      { bucket: 'Low', count: peerMultiples.filter((value) => value < baseMultiple * 0.92).length },
      { bucket: 'Median', count: peerMultiples.filter((value) => value >= baseMultiple * 0.92 && value <= baseMultiple * 1.08).length },
      { bucket: 'High', count: peerMultiples.filter((value) => value > baseMultiple * 1.08).length },
    ],
  };
}
