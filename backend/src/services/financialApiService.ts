import axios from 'axios';

const API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export async function fetchCompanyProfile(ticker: string) {
  if (!API_KEY) {
    throw new Error('FMP_API_KEY is not configured.');
  }

  const url = `${BASE_URL}/profile/${encodeURIComponent(ticker)}?apikey=${API_KEY}`;
  const response = await axios.get(url);
  return response.data?.[0] || null;
}

export async function fetchCompanyFinancials(ticker: string) {
  if (!API_KEY) {
    throw new Error('FMP_API_KEY is not configured.');
  }

  const endpoints = [
    'income-statement',
    'balance-sheet-statement',
    'cash-flow-statement',
  ];

  const [incomeRes, balanceRes, cashflowRes] = await Promise.all(
    endpoints.map((endpoint) => axios.get(`${BASE_URL}/${endpoint}/${encodeURIComponent(ticker)}?limit=1&apikey=${API_KEY}`))
  );

  return {
    profile: await fetchCompanyProfile(ticker),
    incomeStatement: incomeRes.data?.[0] || null,
    balanceSheet: balanceRes.data?.[0] || null,
    cashFlow: cashflowRes.data?.[0] || null,
  };
}
