export type FactorTiltKey = 'quality' | 'value' | 'momentum';

export type FactorCategory = 'value' | 'quality' | 'momentum' | 'growth' | 'volatility' | 'balanceSheet';

export interface FactorRawMetrics {
  ticker: string;
  companyName: string;
  sector: string;
  marketCap: number;
  pe: number;
  evEbitda: number;
  priceToBook: number;
  roe: number;
  ebitdaMargin: number;
  fcfMargin: number;
  return3m: number;
  return6m: number;
  return12m: number;
  revenueGrowth: number;
  ebitdaGrowth: number;
  epsGrowth: number;
  beta: number;
  volatility: number;
  maxDrawdown: number;
  debtToEquity: number;
  cashToDebt: number;
}

export interface FactorScores {
  value: number;
  quality: number;
  momentum: number;
  growth: number;
  volatility: number;
  balanceSheet: number;
}

export interface FactorWeights {
  value: number;
  quality: number;
  momentum: number;
  growth: number;
  volatility: number;
  balanceSheet: number;
}

export interface RankedSecurity {
  rank: number;
  percentile: number;
  ticker: string;
  companyName: string;
  sector: string;
  marketCap: number;
  compositeScore: number;
  factorScores: FactorScores;
  rawMetrics: FactorRawMetrics;
}

export interface FactorCalculationPayload {
  securities: FactorRawMetrics[];
  tilt: FactorTiltKey;
  weights?: Partial<FactorWeights>;
  enabledFactors?: Partial<Record<FactorCategory, boolean>>;
}

export interface FactorChartData {
  factorDistribution: Array<{ factor: string; avgScore: number; fill: string }>;
  rankingScatter: Array<{ ticker: string; compositeScore: number; momentum: number; value: number }>;
  momentumHeatmap: Array<{ ticker: string; return3m: number; return6m: number; return12m: number }>;
  sectorFactorAnalysis: Array<{ sector: string; avgComposite: number; count: number }>;
  compositeHistogram: Array<{ bucket: string; count: number }>;
}

export interface FactorCalculationResult {
  tilt: FactorTiltKey;
  tiltLabel: string;
  weights: FactorWeights;
  rankings: RankedSecurity[];
  topRanked: RankedSecurity[];
  factorLeaders: {
    value: RankedSecurity | null;
    quality: RankedSecurity | null;
    momentum: RankedSecurity | null;
  };
  sectorBreakdown: Array<{ sector: string; count: number; avgComposite: number }>;
  insights: string[];
  charts: FactorChartData;
  universeSize: number;
}

const round = (n: number, d = 2) => Number(n.toFixed(d));

const TILT_LABELS: Record<FactorTiltKey, string> = {
  quality: 'Quality Tilt',
  value: 'Value Tilt',
  momentum: 'Momentum Tilt',
};

export const defaultTiltWeights = (tilt: FactorTiltKey): FactorWeights => {
  const presets: Record<FactorTiltKey, FactorWeights> = {
    quality: { value: 0.1, quality: 0.35, momentum: 0.1, growth: 0.15, volatility: 0.1, balanceSheet: 0.2 },
    value: { value: 0.4, quality: 0.15, momentum: 0.1, growth: 0.1, volatility: 0.1, balanceSheet: 0.15 },
    momentum: { value: 0.08, quality: 0.12, momentum: 0.42, growth: 0.18, volatility: 0.08, balanceSheet: 0.12 },
  };
  return presets[tilt];
};

const zScore = (values: number[], value: number): number => {
  if (!values.length) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance) || 1;
  return round((value - mean) / std, 3);
};

const percentileRank = (rank: number, total: number) =>
  total > 1 ? round(((total - rank) / (total - 1)) * 100, 1) : 100;

const scoreValue = (raw: FactorRawMetrics): number => {
  const peScore = raw.pe > 0 && raw.pe < 80 ? 1 / raw.pe : 0;
  const evScore = raw.evEbitda > 0 && raw.evEbitda < 50 ? 1 / raw.evEbitda : 0;
  const pbScore = raw.priceToBook > 0 && raw.priceToBook < 20 ? 1 / raw.priceToBook : 0;
  return (peScore + evScore + pbScore) / 3;
};

const scoreQuality = (raw: FactorRawMetrics) =>
  (Math.min(raw.roe, 50) / 50 + raw.ebitdaMargin / 40 + raw.fcfMargin / 30) / 3;

const scoreMomentum = (raw: FactorRawMetrics) =>
  (raw.return3m / 30 + raw.return6m / 50 + raw.return12m / 80) / 3;

const scoreGrowth = (raw: FactorRawMetrics) =>
  (raw.revenueGrowth / 30 + raw.ebitdaGrowth / 35 + raw.epsGrowth / 40) / 3;

const scoreVolatility = (raw: FactorRawMetrics) => {
  const lowVol = Math.max(0, 1 - raw.volatility / 50);
  const lowBeta = Math.max(0, 1 - Math.abs(raw.beta - 1) / 1.5);
  const lowDd = Math.max(0, 1 - raw.maxDrawdown / 40);
  return (lowVol + lowBeta + lowDd) / 3;
};

const scoreBalanceSheet = (raw: FactorRawMetrics) => {
  const deScore = raw.debtToEquity >= 0 ? Math.max(0, 1 - raw.debtToEquity / 3) : 0.5;
  const cashScore = Math.min(raw.cashToDebt, 2) / 2;
  return (deScore + cashScore) / 2;
};

const computeFactorScores = (raw: FactorRawMetrics, all: FactorRawMetrics[]): FactorScores => {
  const valueInputs = all.map(scoreValue);
  const qualityInputs = all.map(scoreQuality);
  const momentumInputs = all.map(scoreMomentum);
  const growthInputs = all.map(scoreGrowth);
  const volInputs = all.map(scoreVolatility);
  const bsInputs = all.map(scoreBalanceSheet);

  return {
    value: zScore(valueInputs, scoreValue(raw)),
    quality: zScore(qualityInputs, scoreQuality(raw)),
    momentum: zScore(momentumInputs, scoreMomentum(raw)),
    growth: zScore(growthInputs, scoreGrowth(raw)),
    volatility: zScore(volInputs, scoreVolatility(raw)),
    balanceSheet: zScore(bsInputs, scoreBalanceSheet(raw)),
  };
};

const compositeScore = (scores: FactorScores, weights: FactorWeights, enabled: Record<FactorCategory, boolean>) => {
  let sum = 0;
  let w = 0;
  const entries: Array<[FactorCategory, number]> = [
    ['value', scores.value],
    ['quality', scores.quality],
    ['momentum', scores.momentum],
    ['growth', scores.growth],
    ['volatility', scores.volatility],
    ['balanceSheet', scores.balanceSheet],
  ];
  for (const [key, score] of entries) {
    if (!enabled[key]) continue;
    const weight = weights[key as keyof FactorWeights];
    sum += score * weight;
    w += weight;
  }
  return w > 0 ? round(sum / w, 3) : 0;
};

const buildCharts = (rankings: RankedSecurity[]): FactorChartData => {
  const avg = (fn: (r: RankedSecurity) => number) =>
    rankings.length ? round(rankings.reduce((s, r) => s + fn(r), 0) / rankings.length, 2) : 0;

  const factorDistribution = [
    { factor: 'Value', avgScore: avg((r) => r.factorScores.value), fill: '#7C5CFF' },
    { factor: 'Quality', avgScore: avg((r) => r.factorScores.quality), fill: '#00C896' },
    { factor: 'Momentum', avgScore: avg((r) => r.factorScores.momentum), fill: '#4F8CFF' },
    { factor: 'Growth', avgScore: avg((r) => r.factorScores.growth), fill: '#F5B942' },
    { factor: 'Volatility', avgScore: avg((r) => r.factorScores.volatility), fill: '#FF7A90' },
    { factor: 'Balance Sheet', avgScore: avg((r) => r.factorScores.balanceSheet), fill: '#22D3EE' },
  ];

  const rankingScatter = rankings.map((r) => ({
    ticker: r.ticker,
    compositeScore: r.compositeScore,
    momentum: r.factorScores.momentum,
    value: r.factorScores.value,
  }));

  const momentumHeatmap = rankings
    .slice()
    .sort((a, b) => b.rawMetrics.return12m - a.rawMetrics.return12m)
    .slice(0, 12)
    .map((r) => ({
      ticker: r.ticker,
      return3m: r.rawMetrics.return3m,
      return6m: r.rawMetrics.return6m,
      return12m: r.rawMetrics.return12m,
    }));

  const sectorMap = new Map<string, { sum: number; count: number }>();
  for (const r of rankings) {
    const entry = sectorMap.get(r.sector) ?? { sum: 0, count: 0 };
    entry.sum += r.compositeScore;
    entry.count += 1;
    sectorMap.set(r.sector, entry);
  }
  const sectorFactorAnalysis = [...sectorMap.entries()].map(([sector, data]) => ({
    sector,
    avgComposite: round(data.sum / data.count, 2),
    count: data.count,
  }));

  const buckets = [
    { bucket: '<-1', min: -Infinity, max: -1 },
    { bucket: '-1 to 0', min: -1, max: 0 },
    { bucket: '0 to 1', min: 0, max: 1 },
    { bucket: '>1', min: 1, max: Infinity },
  ];
  const compositeHistogram = buckets.map(({ bucket, min, max }) => ({
    bucket,
    count: rankings.filter((r) => r.compositeScore >= min && r.compositeScore < max).length,
  }));

  return {
    factorDistribution,
    rankingScatter,
    momentumHeatmap,
    sectorFactorAnalysis,
    compositeHistogram,
  };
};

export const generateFactorInsights = (
  rankings: RankedSecurity[],
  tilt: FactorTiltKey,
): string[] => {
  const insights: string[] = [];
  const top = rankings[0];
  const tech = rankings.filter((r) => r.sector.toLowerCase().includes('tech'));
  const avgMom = rankings.length
    ? rankings.reduce((s, r) => s + r.factorScores.momentum, 0) / rankings.length
    : 0;

  if (tilt === 'quality') {
    insights.push('Quality-focused portfolios currently outperform across defensive sectors with stable ROE profiles.');
  } else if (tilt === 'value') {
    insights.push('Value factor exposure increases significantly under higher interest-rate and mean-reversion regimes.');
  } else {
    insights.push('Momentum dispersion remains elevated among large-cap technology and growth-oriented securities.');
  }

  if (avgMom > 0.5) {
    insights.push('Cross-sectional momentum scores skew positive, indicating broad risk-on leadership in the screened universe.');
  }

  if (tech.length >= 3) {
    const techAvg = tech.reduce((s, r) => s + r.compositeScore, 0) / tech.length;
    const rest = rankings.filter((r) => !tech.includes(r));
    const restAvg = rest.length ? rest.reduce((s, r) => s + r.compositeScore, 0) / rest.length : 0;
    if (techAvg > restAvg + 0.3) {
      insights.push('Technology sector composites lead the universe, driven by momentum and growth factor strength.');
    }
  }

  if (top) {
    insights.push(
      `${top.ticker} ranks #1 on composite score (${top.compositeScore.toFixed(2)}σ) under the ${TILT_LABELS[tilt]} framework.`,
    );
  }

  const valueLeaders = [...rankings].sort((a, b) => b.factorScores.value - a.factorScores.value).slice(0, 3);
  if (valueLeaders.every((r) => r.factorScores.value > 1)) {
    insights.push('Deep-value candidates cluster at the top of the value factor, warranting relative-value portfolio tilts.');
  }

  return insights.slice(0, 5);
};

export function calculateFactorScores(payload: FactorCalculationPayload): FactorCalculationResult {
  const { securities, tilt } = payload;
  if (!securities.length) throw new Error('At least one security is required for factor calculation.');

  const baseWeights = defaultTiltWeights(tilt);
  const weights: FactorWeights = { ...baseWeights, ...payload.weights };
  const enabled: Record<FactorCategory, boolean> = {
    value: payload.enabledFactors?.value !== false,
    quality: payload.enabledFactors?.quality !== false,
    momentum: payload.enabledFactors?.momentum !== false,
    growth: payload.enabledFactors?.growth !== false,
    volatility: payload.enabledFactors?.volatility !== false,
    balanceSheet: payload.enabledFactors?.balanceSheet !== false,
  };

  const ranked: RankedSecurity[] = securities.map((raw) => {
    const factorScores = computeFactorScores(raw, securities);
    const composite = compositeScore(factorScores, weights, enabled);
    return {
      rank: 0,
      percentile: 0,
      ticker: raw.ticker,
      companyName: raw.companyName,
      sector: raw.sector,
      marketCap: raw.marketCap,
      compositeScore: composite,
      factorScores,
      rawMetrics: raw,
    };
  });

  ranked.sort((a, b) => b.compositeScore - a.compositeScore);
  ranked.forEach((row, i) => {
    row.rank = i + 1;
    row.percentile = percentileRank(i + 1, ranked.length);
  });

  const sectorMap = new Map<string, { count: number; sum: number }>();
  for (const r of ranked) {
    const e = sectorMap.get(r.sector) ?? { count: 0, sum: 0 };
    e.count += 1;
    e.sum += r.compositeScore;
    sectorMap.set(r.sector, e);
  }

  const findLeader = (key: keyof FactorScores) =>
    [...ranked].sort((a, b) => b.factorScores[key] - a.factorScores[key])[0] ?? null;

  return {
    tilt,
    tiltLabel: TILT_LABELS[tilt],
    weights,
    rankings: ranked,
    topRanked: ranked.slice(0, 10),
    factorLeaders: {
      value: findLeader('value'),
      quality: findLeader('quality'),
      momentum: findLeader('momentum'),
    },
    sectorBreakdown: [...sectorMap.entries()].map(([sector, data]) => ({
      sector,
      count: data.count,
      avgComposite: round(data.sum / data.count, 2),
    })),
    insights: generateFactorInsights(ranked, tilt),
    charts: buildCharts(ranked),
    universeSize: ranked.length,
  };
}
