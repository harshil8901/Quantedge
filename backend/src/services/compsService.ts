import axios from 'axios';
import { CompsFinancials, deriveEnterpriseValue } from '../calculations/compsCalculation';
import { fetchFmpCompanySnapshot, isRapidApiKey } from './fmpService';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const V4_URL = 'https://financialmodelingprep.com/api/v4';
const RAPID_BASE_URL = 'https://financial-modeling-prep.p.rapidapi.com/v3';
const RAPID_V4_URL = 'https://financial-modeling-prep.p.rapidapi.com/v4';

const getApiKey = () => {
  const apiKey = process.env.FMP_API_KEY || process.env.FINANCIAL_MODELING_PREP_API_KEY;
  if (!apiKey) {
    throw new Error('FMP_API_KEY (or FINANCIAL_MODELING_PREP_API_KEY) is not configured.');
  }
  return apiKey;
};

const rapidHeaders = (apiKey: string) => ({
  'x-rapidapi-key': apiKey,
  'x-rapidapi-host': 'financial-modeling-prep.p.rapidapi.com',
});

/** Industry-based peer suggestions when FMP stock_peers is unavailable (e.g. RapidAPI proxy). */
const INDUSTRY_PEER_MAP: Record<string, string[]> = {
  'Consumer Electronics': ['MSFT', 'GOOGL', 'META', 'AMZN', 'QCOM', 'DELL', 'HPQ', 'SONY'],
  'Software - Infrastructure': ['MSFT', 'ORCL', 'CRM', 'NOW', 'ADBE', 'INTU', 'SNOW'],
  'Software—Infrastructure': ['MSFT', 'ORCL', 'CRM', 'NOW', 'ADBE', 'INTU', 'SNOW'],
  'Software - Application': ['MSFT', 'CRM', 'ADBE', 'NOW', 'INTU', 'WDAY'],
  Semiconductors: ['NVDA', 'AMD', 'INTC', 'QCOM', 'AVGO', 'TXN', 'MU'],
  'Internet Content & Information': ['GOOGL', 'META', 'SNAP', 'PINS', 'RDDT'],
  'Auto Manufacturers': ['TSLA', 'F', 'GM', 'TM', 'STLA'],
  'Banks - Diversified': ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS'],
  'Drug Manufacturers - General': ['JNJ', 'PFE', 'MRK', 'ABBV', 'LLY', 'BMY'],
  'Discount Stores': ['WMT', 'COST', 'TGT', 'DG', 'DLTR'],
};

const SECTOR_PEER_MAP: Record<string, string[]> = {
  Technology: ['MSFT', 'GOOGL', 'META', 'AMZN', 'NVDA', 'ORCL', 'CRM', 'ADBE'],
  Healthcare: ['JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY'],
  'Financial Services': ['JPM', 'BAC', 'BRK-B', 'WFC', 'GS', 'MS'],
  'Consumer Cyclical': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX'],
  'Consumer Defensive': ['WMT', 'PG', 'KO', 'PEP', 'COST', 'PM'],
  Energy: ['XOM', 'CVX', 'COP', 'SLB', 'EOG'],
  Industrials: ['CAT', 'GE', 'HON', 'UPS', 'RTX', 'DE'],
  'Communication Services': ['GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA'],
};

const mapSnapshotToCompsFinancials = (
  snapshot: Awaited<ReturnType<typeof fetchFmpCompanySnapshot>>,
): CompsFinancials => {
  const marketCap = snapshot.marketCap || snapshot.currentPrice * snapshot.sharesOutstanding;
  const enterpriseValue = deriveEnterpriseValue(marketCap, snapshot.debt, snapshot.cash);

  return {
    ticker: snapshot.ticker,
    companyName: snapshot.companyName,
    stockPrice: snapshot.currentPrice,
    marketCap,
    enterpriseValue,
    revenue: snapshot.revenue,
    ebitda: snapshot.ebitda,
    ebit: snapshot.ebit,
    netIncome: snapshot.netIncome,
    cash: snapshot.cash,
    debt: snapshot.debt,
    sharesOutstanding: snapshot.sharesOutstanding,
    ebitdaMargin: snapshot.historicalEbitdaMargin,
    revenueGrowth: snapshot.historicalRevenueGrowth,
  };
};

const fetchProfileSectorIndustry = async (ticker: string): Promise<{ sector: string; industry: string }> => {
  const apiKey = getApiKey();
  const symbol = encodeURIComponent(ticker.toUpperCase());

  try {
    if (isRapidApiKey(apiKey)) {
      const response = await axios.get(`${RAPID_BASE_URL}/profile/${symbol}`, {
        headers: rapidHeaders(apiKey),
        timeout: 12000,
      });
      const profile = response.data?.[0] ?? {};
      return {
        sector: String(profile.sector || '').trim(),
        industry: String(profile.industry || '').trim(),
      };
    }

    const response = await axios.get(`${BASE_URL}/profile/${symbol}`, {
      params: { apikey: apiKey },
      timeout: 12000,
    });
    const profile = response.data?.[0] ?? {};
    return {
      sector: String(profile.sector || '').trim(),
      industry: String(profile.industry || '').trim(),
    };
  } catch {
    return { sector: '', industry: '' };
  }
};

const inferPeersFromSectorIndustry = async (ticker: string): Promise<string[]> => {
  const { sector, industry } = await fetchProfileSectorIndustry(ticker);
  const normalized = ticker.toUpperCase();

  const industryPeers = industry ? INDUSTRY_PEER_MAP[industry] : undefined;
  const sectorPeers = sector ? SECTOR_PEER_MAP[sector] : undefined;
  const candidates = industryPeers || sectorPeers || SECTOR_PEER_MAP.Technology;

  return candidates.filter((symbol) => symbol !== normalized).slice(0, 10);
};

export const fetchCompsCompanyFinancials = async (ticker: string): Promise<CompsFinancials> => {
  const snapshot = await fetchFmpCompanySnapshot(ticker);
  return mapSnapshotToCompsFinancials(snapshot);
};

export const fetchStockPeers = async (ticker: string): Promise<string[]> => {
  const apiKey = getApiKey();
  const symbol = encodeURIComponent(ticker.toUpperCase());

  if (!isRapidApiKey(apiKey)) {
    try {
      const response = await axios.get(`${V4_URL}/stock_peers`, {
        params: { symbol, apikey: apiKey },
        timeout: 12000,
      });
      const rows = Array.isArray(response.data) ? response.data : [];
      const row = rows[0] as Record<string, unknown> | undefined;
      const peersList = String(row?.peersList || row?.peers || '');
      const parsed = peersList
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter((item) => item && item !== ticker.toUpperCase());
      if (parsed.length) return Array.from(new Set(parsed)).slice(0, 12);
    } catch {
      // fall through to industry inference
    }
  }

  return inferPeersFromSectorIndustry(ticker);
};

export const fetchPeerFinancialsBatch = async (tickers: string[]): Promise<CompsFinancials[]> => {
  const unique = Array.from(new Set(tickers.map((t) => t.toUpperCase()))).slice(0, 10);
  const results = await Promise.allSettled(unique.map((symbol) => fetchCompsCompanyFinancials(symbol)));

  return results
    .filter((result): result is PromiseFulfilledResult<CompsFinancials> => result.status === 'fulfilled')
    .map((result) => result.value);
};

export interface CompsWorkspaceSnapshot {
  target: CompsFinancials;
  suggestedPeers: string[];
  peers: CompsFinancials[];
  provider: 'fmp';
  peerSource: 'fmp_peers' | 'industry_inferred';
}

export const fetchCompsWorkspace = async (ticker: string, peerOverride?: string[]): Promise<CompsWorkspaceSnapshot> => {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!normalizedTicker) {
    throw new Error('Ticker is required.');
  }

  const target = await fetchCompsCompanyFinancials(normalizedTicker);

  let peerSource: CompsWorkspaceSnapshot['peerSource'] = 'industry_inferred';
  let suggestedPeers: string[] = [];

  if (peerOverride?.length) {
    suggestedPeers = peerOverride.map((p) => p.toUpperCase());
    peerSource = 'fmp_peers';
  } else {
    suggestedPeers = await fetchStockPeers(normalizedTicker);
    peerSource = isRapidApiKey(getApiKey()) ? 'industry_inferred' : 'fmp_peers';
  }

  const peerTickers = suggestedPeers.filter((peer) => peer !== normalizedTicker).slice(0, 10);
  const peers = peerTickers.length ? await fetchPeerFinancialsBatch(peerTickers) : [];

  return {
    target,
    suggestedPeers: peerTickers,
    peers,
    provider: 'fmp',
    peerSource,
  };
};

export const validatePeerTicker = async (ticker: string): Promise<CompsFinancials> => {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) throw new Error('Peer ticker is required.');
  return fetchCompsCompanyFinancials(normalized);
};
