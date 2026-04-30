interface DCFInputs {
  revenueGrowth: number;
  ebitdaMargin: number;
  ebitMargin: number;
  wacc: number;
  terminalGrowth: number;
  capex: number;
  workingCapital: number;
  taxRate: number;
  cash: number;
  debt: number;
  sharesOutstanding: number;
  baseFcf: number;
}

interface DCFResults {
  enterpriseValue: number;
  equityValue: number;
  fairValuePerShare: number;
  marginOfSafety: number;
  fcfProjection: number[];
  presentValues: number[];
}

export function calculateDCF(inputs: DCFInputs): DCFResults {
  const {
    revenueGrowth,
    wacc,
    terminalGrowth,
    cash,
    debt,
    sharesOutstanding,
    baseFcf,
  } = inputs;

  // Project FCF for 5 years
  const fcfProjection: number[] = [];
  for (let t = 1; t <= 5; t++) {
    const fcf = baseFcf * Math.pow(1 + revenueGrowth, t);
    fcfProjection.push(fcf);
  }

  // Present values of FCF
  const presentValues: number[] = [];
  let pvFcfSum = 0;
  for (let t = 1; t <= 5; t++) {
    const pv = fcfProjection[t - 1] / Math.pow(1 + wacc, t);
    presentValues.push(pv);
    pvFcfSum += pv;
  }

  // Terminal value
  const terminalFcf = fcfProjection[4] * (1 + terminalGrowth);
  const terminalValue = terminalFcf / (wacc - terminalGrowth);
  const pvTerminal = terminalValue / Math.pow(1 + wacc, 5);
  presentValues.push(pvTerminal);

  // Enterprise value
  const enterpriseValue = pvFcfSum + pvTerminal;

  // Equity value
  const equityValue = enterpriseValue + cash - debt;

  // Fair value per share
  const fairValuePerShare = equityValue / sharesOutstanding;

  // Margin of safety (assuming current price is not provided, set to 0)
  const marginOfSafety = 0;

  return {
    enterpriseValue,
    equityValue,
    fairValuePerShare,
    marginOfSafety,
    fcfProjection,
    presentValues,
  };
}