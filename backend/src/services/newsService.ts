import axios from 'axios';

export type NewsCategory = 'All' | 'Markets' | 'Macro' | 'Tech' | 'Earnings' | 'AI' | 'Energy';

export interface NewsItem {
  headline: string;
  source: string;
  timestamp: string;
  summary: string;
  image?: string;
  relatedTickers: string[];
  articleUrl: string;
  category: NewsCategory;
}

export interface NewsSnapshot {
  items: NewsItem[];
  provider: string;
  queryUsed: string;
}

interface NewsProvider {
  name: string;
  fetchNews(params: { query: string; language: string; pageSize: number }): Promise<NewsItem[]>;
}

const DEFAULT_QUERY = '(stock market OR federal reserve OR inflation OR earnings OR AI stocks OR geopolitics OR oil prices)';

const CATEGORY_QUERIES: Record<NewsCategory, string> = {
  All: '(stock market OR federal reserve OR inflation OR earnings OR AI stocks OR geopolitics)',
  Markets: '(stock market OR equities OR indexes OR trading)',
  Macro: '(inflation OR federal reserve OR treasury yields OR economy)',
  Tech: '(AI OR semiconductors OR Nvidia OR big tech)',
  Earnings: '(earnings OR quarterly results OR guidance)',
  AI: '(AI infrastructure OR OpenAI OR Nvidia OR machine learning)',
  Energy: '(oil prices OR OPEC OR energy markets)',
};

const CATEGORY_HINTS: Array<{ category: NewsCategory; hints: string[] }> = [
  { category: 'Energy', hints: ['oil', 'opec', 'gas', 'energy', 'brent', 'wti'] },
  { category: 'Earnings', hints: ['earnings', 'guidance', 'quarter', 'results', 'eps'] },
  { category: 'Macro', hints: ['federal reserve', 'inflation', 'treasury', 'bond', 'economy', 'macro'] },
  { category: 'AI', hints: ['ai', 'openai', 'machine learning', 'artificial intelligence'] },
  { category: 'Tech', hints: ['semiconductor', 'nvidia', 'big tech', 'software', 'cloud'] },
  { category: 'Markets', hints: ['market', 'equities', 'index', 'trading', 'stocks'] },
];

const getRapidApiConfig = () => {
  const rapidApiKey = process.env.RAPIDAPI_KEY || '';
  const rapidApiHost = process.env.RAPIDAPI_HOST || 'news-api14.p.rapidapi.com';
  const rapidApiNewsUrl = process.env.RAPIDAPI_NEWS_URL || `https://${rapidApiHost}/v2/search/articles`;
  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY must be configured.');
  }
  return { rapidApiKey, rapidApiHost, rapidApiNewsUrl };
};

const resolveCategory = (text: string): NewsCategory => {
  const lower = text.toLowerCase();
  const match = CATEGORY_HINTS.find(({ hints }) => hints.some((hint) => lower.includes(hint)));
  return match?.category || 'Markets';
};

const extractTickers = (text: string): string[] => {
  const tokens = text.match(/\b[A-Z]{2,5}\b/g) || [];
  const unique = Array.from(new Set(tokens));
  return unique.slice(0, 3);
};

const normalizeArticle = (article: Record<string, unknown>): NewsItem | null => {
  const sourceObject = article.source as Record<string, unknown> | undefined;
  const headline = String(article.title || article.headline || '').trim();
  const summary = String(article.description || article.summary || article.snippet || '').trim();
  const articleUrl = String(article.url || article.link || article.article_url || '').trim();
  if (!headline || !articleUrl) return null;

  const source =
    String(sourceObject?.name || article.source_name || article.source || 'Market Wire').trim() || 'Market Wire';
  const timestamp = String(article.publishedAt || article.pubDate || article.published_at || new Date().toISOString());
  const image = String(
    article.logo ||
      article.Logo ||
      sourceObject?.logo ||
      sourceObject?.Logo ||
      article.urlToImage ||
      article.image_url ||
      article.image ||
      article.thumbnail ||
      ''
  ).trim() || undefined;
  const mergedText = `${headline} ${summary}`;
  const relatedTickersRaw = Array.isArray(article.symbols) ? article.symbols.map((symbol) => String(symbol)) : extractTickers(mergedText);
  const relatedTickers = relatedTickersRaw.filter(Boolean).slice(0, 3);

  return {
    headline,
    source,
    timestamp,
    summary: summary || 'Market desk update available in full article.',
    image,
    relatedTickers,
    articleUrl,
    category: resolveCategory(mergedText),
  };
};

const rapidApiProvider: NewsProvider = {
  name: 'rapidapi-news-api14',
  async fetchNews({ query, language, pageSize }) {
    const { rapidApiKey, rapidApiHost, rapidApiNewsUrl } = getRapidApiConfig();
    const response = await axios.get(rapidApiNewsUrl, {
      params: {
        query: query || DEFAULT_QUERY,
        language,
        sort: 'date',
        pageSize,
      },
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost,
        'Content-Type': 'application/json',
      },
      timeout: 12000,
    });

    const payload = response.data as Record<string, unknown>;
    const payloadData = payload.data as Record<string, unknown> | undefined;
    const rawArticles = (
      Array.isArray(payload.articles)
        ? payload.articles
        : Array.isArray(payloadData?.articles)
          ? payloadData?.articles
          : Array.isArray(payloadData)
            ? payloadData
            : Array.isArray(payload.results)
              ? payload.results
              : []
    ) as Record<string, unknown>[];

    return rawArticles.map(normalizeArticle).filter((item): item is NewsItem => Boolean(item)).slice(0, pageSize);
  },
};

const providers: NewsProvider[] = [rapidApiProvider];

export const resolveNewsQuery = (category?: string, search?: string): string => {
  const normalizedCategory = (category || 'All') as NewsCategory;
  const categoryQuery = CATEGORY_QUERIES[normalizedCategory] || CATEGORY_QUERIES.All;
  if (search && search.trim()) {
    return `(${search.trim()}) AND ${categoryQuery}`;
  }
  return category === 'All' ? DEFAULT_QUERY : categoryQuery;
};

export const fetchMarketNews = async (params: { category?: string; search?: string; pageSize?: number; language?: string }): Promise<NewsSnapshot> => {
  const queryUsed = resolveNewsQuery(params.category, params.search);
  const pageSize = Math.max(6, Math.min(params.pageSize || 18, 30));
  const language = params.language || 'en';

  let lastError: unknown;
  for (const provider of providers) {
    try {
      const items = await provider.fetchNews({ query: queryUsed, language, pageSize });
      return {
        items,
        provider: provider.name,
        queryUsed,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(lastError instanceof Error ? lastError.message : 'Unable to fetch market news.');
};
