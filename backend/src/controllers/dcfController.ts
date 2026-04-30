import { Request, Response } from 'express';
import { calculateDCFWorkflow, DCFCompanyInputs, DCFScenarioAssumptions, ScenarioKey } from '../calculations/dcfCalculation';
import { fetchFmpCompanySnapshot, fetchFmpMarketIndices, fetchFmpMarketMovers } from '../services/fmpService';
import { fetchAlphaVantageSnapshot } from '../services/alphaVantageService';
import { fetchYahooIndicesSnapshot, fetchYahooSnapshot } from '../services/yahooFinanceService';

type DCFWorkflowPayload = {
  companyData: DCFCompanyInputs;
  assumptions: Record<ScenarioKey, DCFScenarioAssumptions>;
};

export const handleDCF = (req: Request, res: Response) => {
  const payload = req.body as Partial<DCFWorkflowPayload>;
  if (!payload.companyData || !payload.assumptions) {
    return res.status(400).json({ error: 'companyData and assumptions are required.' });
  }
  if (!payload.companyData.sharesOutstanding || payload.companyData.sharesOutstanding <= 0) {
    return res.status(400).json({ error: 'Shares outstanding must be greater than zero.' });
  }

  const output = calculateDCFWorkflow(payload.companyData, payload.assumptions);
  return res.json(output);
};

export const handleCompanyLookup = async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').trim();
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required.' });
  }

  try {
    const fmpSnapshot = await fetchFmpCompanySnapshot(ticker);
    return res.json({ ...fmpSnapshot, fallbackUsed: false });
  } catch (fmpError) {
    try {
      const alpha = await fetchAlphaVantageSnapshot(ticker);
      return res.json({ ...alpha, fallbackUsed: true });
    } catch (alphaError) {
      try {
        const yahoo = await fetchYahooSnapshot(ticker);
        return res.json({ ...yahoo, fallbackUsed: true });
      } catch (yahooError) {
        const fmpMessage = fmpError instanceof Error ? fmpError.message : 'FMP fetch failed.';
        const alphaMessage = alphaError instanceof Error ? alphaError.message : 'Alpha Vantage fetch failed.';
        const yahooMessage = yahooError instanceof Error ? yahooError.message : 'Yahoo fetch failed.';
        return res.status(500).json({ error: `Unable to fetch company data. ${fmpMessage} ${alphaMessage} ${yahooMessage}` });
      }
    }
  }
};

export const handleMarketMovers = async (_req: Request, res: Response) => {
  try {
    const movers = await fetchFmpMarketMovers();
    return res.json(movers);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch market movers.' });
  }
};

export const handleMarketIndices = async (_req: Request, res: Response) => {
  try {
    const indices = await fetchFmpMarketIndices();
    return res.json(indices);
  } catch (fmpError) {
    try {
      const fallback = await fetchYahooIndicesSnapshot();
      return res.json(fallback);
    } catch (yahooError) {
      const fmpMessage = fmpError instanceof Error ? fmpError.message : 'FMP indices fetch failed.';
      const yahooMessage = yahooError instanceof Error ? yahooError.message : 'Yahoo indices fetch failed.';
      return res.status(500).json({ error: `Failed to fetch market indices. ${fmpMessage} ${yahooMessage}` });
    }
  }
};
