import axios from 'axios';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const RAPID_BASE_URL = 'https://financial-modeling-prep.p.rapidapi.com/v3';
const getApiKey = () => {
  const apiKey = process.env.FMP_API_KEY || process.env.FINANCIAL_MODELING_PREP_API_KEY;
  if (!apiKey) {
    throw new Error('FMP_API_KEY (or FINANCIAL_MODELING_PREP_API_KEY) is not configured.');
  }
  return apiKey;
};

export const isRapidApiKey = (apiKey: string) => apiKey.includes('msh') || apiKey.length > 40;

const rapidHeaders = (apiKey: string) => ({
  'x-rapidapi-key': apiKey,
  'x-rapidapi-host': 'financial-modeling-prep.p.rapidapi.com',
});

const formatFmpError = (error: unknown, usingRapid: boolean): Error => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) {
      return new Error(
        usingRapid
          ? 'RapidAPI authentication failed. Check FMP_API_KEY in backend/.env matches your RapidAPI Financial Modeling Prep subscription.'
          : 'Invalid FMP API key. Use a key from financialmodelingprep.com or a valid RapidAPI FMP key in FMP_API_KEY.',
      );
    }
    if (status === 403) {
      return new Error('FMP access forbidden for this endpoint. Your API plan may not include this data.');
    }
    if (status === 429) {
      return new Error(
        'FMP data quota exceeded (rate limit). Wait for your RapidAPI daily limit to reset or upgrade your plan.',
      );
    }
    const message = (error.response?.data as { message?: string })?.message;
    if (message) return new Error(message);
  }
  return error instanceof Error ? error : new Error('Failed to fetch FMP market data.');
};

const toNumber = (value: unknown): number => (typeof value === 'number' ? value : Number(value ?? 0)) || 0;

export interface CompanyDataSnapshot {
  companyName: string;
  ticker: string;
  currentPrice: number;
  marketCap: number;
  sharesOutstanding: number;
  revenue: number;
  ebitda: number;
  ebit: number;
  netIncome: number;
  cash: number;
  debt: number;
  workingCapital: number;
  freeCashFlow: number;
  capex: number;
  depreciationAndAmortization: number;
  historicalRevenueGrowth: number;
  historicalEbitdaMargin: number;
  historicalEbitMargin: number;
  historicalFcfMargin: number;
  source: 'fmp';
}

export interface MarketMover {
  symbol: string;
  name: string;
  change: number;
  price: number;
  volume: number;
}

export interface MarketMoversSnapshot {
  gainers: MarketMover[];
  losers: MarketMover[];
  source: 'fmp';
}

export interface MarketIndex {
  symbol: string;
  price: number;
  change: number;
}

export interface MarketIndicesSnapshot {
  indices: MarketIndex[];
  source: 'fmp';
}

const mapMover = (row: Record<string, unknown>): MarketMover => ({
  symbol: String(row.ticker || row.symbol || ''),
  name: String(row.companyName || row.name || row.ticker || row.symbol || ''),
  change: toNumber(row.changesPercentage || row.changes || row.change),
  price: toNumber(row.price),
  volume: toNumber(row.volume),
});

export const fetchFmpCompanySnapshot = async (ticker: string): Promise<CompanyDataSnapshot> => {
  const apiKey = getApiKey();
  const symbol = encodeURIComponent(ticker.toUpperCase());

  const fetchDirect = async () =>
    Promise.all([
      axios.get(`${BASE_URL}/profile/${symbol}?apikey=${apiKey}`),
      axios.get(`${BASE_URL}/income-statement/${symbol}?limit=2&apikey=${apiKey}`),
      axios.get(`${BASE_URL}/balance-sheet-statement/${symbol}?limit=2&apikey=${apiKey}`),
      axios.get(`${BASE_URL}/cash-flow-statement/${symbol}?limit=2&apikey=${apiKey}`),
    ]);

  const fetchRapid = async () =>
    Promise.all([
      axios.get(`${RAPID_BASE_URL}/profile/${symbol}`, { headers: rapidHeaders(apiKey) }),
      axios.get(`${RAPID_BASE_URL}/income-statement/${symbol}?limit=2`, { headers: rapidHeaders(apiKey) }),
      axios.get(`${RAPID_BASE_URL}/balance-sheet-statement/${symbol}?limit=2`, { headers: rapidHeaders(apiKey) }),
      axios.get(`${RAPID_BASE_URL}/cash-flow-statement/${symbol}?limit=2`, { headers: rapidHeaders(apiKey) }),
    ]);

  let profileRes;
  let incomeRes;
  let balanceRes;
  let cashFlowRes;
  const useRapid = isRapidApiKey(apiKey);

  try {
    [profileRes, incomeRes, balanceRes, cashFlowRes] = useRapid ? await fetchRapid() : await fetchDirect();
  } catch (primaryError) {
    if (useRapid) {
      throw formatFmpError(primaryError, true);
    }
    try {
      [profileRes, incomeRes, balanceRes, cashFlowRes] = await fetchRapid();
    } catch (fallbackError) {
      throw formatFmpError(fallbackError, true);
    }
  }

  const profile = profileRes.data?.[0] ?? {};
  const income = incomeRes.data?.[0] ?? {};
  const prevIncome = incomeRes.data?.[1] ?? {};
  const balance = balanceRes.data?.[0] ?? {};
  const cashFlow = cashFlowRes.data?.[0] ?? {};

  const revenue = toNumber(income.revenue);
  const previousRevenue = toNumber(prevIncome.revenue);
  const ebitda = toNumber(income.ebitda);
  const ebit = toNumber(income.operatingIncome || income.ebit);
  const freeCashFlow = toNumber(cashFlow.freeCashFlow);
  const capex = Math.abs(toNumber(cashFlow.capitalExpenditure));
  const depreciationAndAmortization = toNumber(cashFlow.depreciationAndAmortization);
  const currentAssets = toNumber(balance.totalCurrentAssets);
  const currentLiabilities = toNumber(balance.totalCurrentLiabilities);

  const profileShares = toNumber(profile.sharesOutstanding);
  const statementShares = toNumber(income.weightedAverageShsOutDil || income.weightedAverageShsOut);
  const impliedShares = toNumber(profile.mktCap || profile.marketCap) > 0 && toNumber(profile.price) > 0
    ? toNumber(profile.mktCap || profile.marketCap) / toNumber(profile.price)
    : 0;
  const resolvedSharesOutstanding = profileShares || statementShares || impliedShares;

  return {
    companyName: profile.companyName || profile.name || ticker.toUpperCase(),
    ticker: profile.symbol || ticker.toUpperCase(),
    currentPrice: toNumber(profile.price),
    marketCap: toNumber(profile.mktCap || profile.marketCap),
    sharesOutstanding: resolvedSharesOutstanding,
    revenue,
    ebitda,
    ebit,
    netIncome: toNumber(income.netIncome),
    cash: toNumber(balance.cashAndCashEquivalents || balance.cashAndShortTermInvestments),
    debt: toNumber(balance.totalDebt),
    workingCapital: currentAssets - currentLiabilities,
    freeCashFlow,
    capex,
    depreciationAndAmortization,
    historicalRevenueGrowth: previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0,
    historicalEbitdaMargin: revenue > 0 ? (ebitda / revenue) * 100 : 0,
    historicalEbitMargin: revenue > 0 ? (ebit / revenue) * 100 : 0,
    historicalFcfMargin: revenue > 0 ? (freeCashFlow / revenue) * 100 : 0,
    source: 'fmp',
  };
};

export const fetchFmpMarketMovers = async (): Promise<MarketMoversSnapshot> => {
  const apiKey = getApiKey();

  const fetchDirect = async () =>
    Promise.all([
      axios.get(`${BASE_URL}/stock_market/gainers?apikey=${apiKey}`),
      axios.get(`${BASE_URL}/stock_market/losers?apikey=${apiKey}`),
    ]);

  const fetchRapid = async () =>
    Promise.all([
      axios.get(`${RAPID_BASE_URL}/stock_market/gainers`, { headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'financial-modeling-prep.p.rapidapi.com' } }),
      axios.get(`${RAPID_BASE_URL}/stock_market/losers`, { headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'financial-modeling-prep.p.rapidapi.com' } }),
    ]);

  let gainersRes;
  let losersRes;
  try {
    [gainersRes, losersRes] = await fetchDirect();
  } catch (directError) {
    [gainersRes, losersRes] = await fetchRapid();
  }

  const gainersRaw = Array.isArray(gainersRes.data) ? gainersRes.data : [];
  const losersRaw = Array.isArray(losersRes.data) ? losersRes.data : [];

  return {
    gainers: gainersRaw.slice(0, 8).map((item: Record<string, unknown>) => mapMover(item)),
    losers: losersRaw.slice(0, 8).map((item: Record<string, unknown>) => mapMover(item)),
    source: 'fmp',
  };
};

const GLOBAL_INDEX_MAP: Array<{ key: string; label: string }> = [
  { key: '^GSPC', label: 'S&P 500' },
  { key: '^NDX', label: 'NASDAQ 100' },
  { key: '^DJI', label: 'DOW JONES' },
  { key: '^RUT', label: 'RUSSELL 2000' },
  { key: '^VIX', label: 'VIX' },
  { key: '^FTSE', label: 'FTSE 100' },
  { key: '^GDAXI', label: 'DAX' },
  { key: '^FCHI', label: 'CAC 40' },
  { key: '^STOXX50E', label: 'EURO STOXX 50' },
  { key: '^N225', label: 'NIKKEI 225' },
  { key: '^TOPX', label: 'TOPIX' },
  { key: '^HSI', label: 'HANG SENG' },
  { key: '000001.SS', label: 'SHANGHAI COMP' },
  { key: '399300.SZ', label: 'CSI 300' },
  { key: '^KS11', label: 'KOSPI' },
  { key: '^NSEI', label: 'NIFTY 50' },
  { key: '^BSESN', label: 'SENSEX' },
  { key: '^NSEBANK', label: 'NIFTY BANK' },
  { key: '^BVSP', label: 'BOVESPA' },
  { key: '^GSPTSE', label: 'TSX' },
  { key: '^AXJO', label: 'ASX 200' },
];

const GLOBAL_INDEX_PROXY_MAP: Array<{ key: string; label: string }> = [
  { key: 'SPY', label: 'S&P 500' },
  { key: 'QQQ', label: 'NASDAQ 100' },
  { key: 'DIA', label: 'DOW JONES' },
  { key: 'IWM', label: 'RUSSELL 2000' },
  { key: 'VIXY', label: 'VIX' },
  { key: 'EWU', label: 'FTSE 100' },
  { key: 'EWG', label: 'DAX' },
  { key: 'EWQ', label: 'CAC 40' },
  { key: 'FEZ', label: 'EURO STOXX 50' },
  { key: 'EWJ', label: 'NIKKEI 225' },
  { key: 'EWJ', label: 'TOPIX' },
  { key: 'EWH', label: 'HANG SENG' },
  { key: 'MCHI', label: 'SHANGHAI COMP' },
  { key: 'ASHR', label: 'CSI 300' },
  { key: 'EWY', label: 'KOSPI' },
  { key: 'INDA', label: 'NIFTY 50' },
  { key: 'INDA', label: 'SENSEX' },
  { key: 'INCO', label: 'NIFTY BANK' },
  { key: 'EWZ', label: 'BOVESPA' },
  { key: 'EWC', label: 'TSX' },
  { key: 'EWA', label: 'ASX 200' },
];

export const fetchFmpMarketIndices = async (): Promise<MarketIndicesSnapshot> => {
  const apiKey = getApiKey();

  const fetchDirect = async () => axios.get(`${BASE_URL}/quotes/index?apikey=${apiKey}`);
  const fetchRapid = async () =>
    axios.get(`${RAPID_BASE_URL}/quotes/index`, {
      headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'financial-modeling-prep.p.rapidapi.com' },
    });

  let response;
  try {
    response = await fetchDirect();
  } catch (directError) {
    response = await fetchRapid();
  }

  let rows = Array.isArray(response.data) ? response.data : [];
  if (!rows.length) {
    const indexSymbols = GLOBAL_INDEX_MAP.map((item) => item.key).join(',');
    const fetchQuoteDirect = async () => axios.get(`${BASE_URL}/quote/${indexSymbols}?apikey=${apiKey}`);
    const fetchQuoteRapid = async () =>
      axios.get(`${RAPID_BASE_URL}/quote/${indexSymbols}`, {
        headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'financial-modeling-prep.p.rapidapi.com' },
      });
    try {
      const quoteResponse = await fetchQuoteDirect();
      rows = Array.isArray(quoteResponse.data) ? quoteResponse.data : [];
    } catch (directQuoteError) {
      const quoteResponse = await fetchQuoteRapid();
      rows = Array.isArray(quoteResponse.data) ? quoteResponse.data : [];
    }
  }

  const bySymbol = new Map<string, Record<string, unknown>>();
  rows.forEach((row: Record<string, unknown>) => {
    const symbol = String(row.symbol || row.ticker || '');
    if (symbol) bySymbol.set(symbol, row);
  });

  const indices = GLOBAL_INDEX_MAP.map(({ key, label }) => {
    const row = bySymbol.get(key) || {};
    return {
      symbol: label,
      price: toNumber(row.price),
      change: toNumber(row.changesPercentage || row.change),
    };
  }).filter((item) => item.price > 0);

  if (!indices.length) {
    const proxySymbols = GLOBAL_INDEX_PROXY_MAP.map((item) => item.key).join(',');
    const fetchProxyDirect = async () => axios.get(`${BASE_URL}/quote/${proxySymbols}?apikey=${apiKey}`);
    const fetchProxyRapid = async () =>
      axios.get(`${RAPID_BASE_URL}/quote/${proxySymbols}`, {
        headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'financial-modeling-prep.p.rapidapi.com' },
      });
    let proxyRows: Record<string, unknown>[] = [];
    try {
      const proxyResponse = await fetchProxyDirect();
      proxyRows = Array.isArray(proxyResponse.data) ? proxyResponse.data : [];
    } catch (proxyDirectError) {
      const proxyResponse = await fetchProxyRapid();
      proxyRows = Array.isArray(proxyResponse.data) ? proxyResponse.data : [];
    }

    const proxyBySymbol = new Map<string, Record<string, unknown>>();
    proxyRows.forEach((row: Record<string, unknown>) => {
      const symbol = String(row.symbol || row.ticker || '');
      if (symbol) proxyBySymbol.set(symbol, row);
    });

    const proxyIndices = GLOBAL_INDEX_PROXY_MAP.map(({ key, label }) => {
      const row = proxyBySymbol.get(key) || {};
      return {
        symbol: label,
        price: toNumber(row.price),
        change: toNumber(row.changesPercentage || row.change),
      };
    }).filter((item) => item.price > 0);

    if (!proxyIndices.length) {
      throw new Error('FMP indices feed returned no supported symbols.');
    }

    return {
      indices: proxyIndices,
      source: 'fmp',
    };
  }

  return {
    indices,
    source: 'fmp',
  };
};
