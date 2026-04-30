export interface DCFInputs {
  currentSharePrice: number;
  sharesOutstanding: number;
  cash: number;
  debt: number;
  revenueGrowth: number;
  ebitdaMargin: number;
  ebitMargin: number;
  wacc: number;
  terminalGrowth: number;
  baseFcf: number;
  capex: number;
  taxRate: number;
  workingCapital: number;
}

export interface CompsInputs {
  revenue: number;
  ebitda: number;
  netIncome: number;
  sharePrice: number;
  enterpriseValue: number;
  peerMultiple: number;
}

export interface DDMInputs {
  dividendPerShare: number;
  dividendGrowth: number;
  costOfEquity: number;
}
