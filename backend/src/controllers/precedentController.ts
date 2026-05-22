import { Request, Response } from 'express';
import {
  calculatePrecedentValuation,
  PrecedentValuationPayload,
} from '../calculations/precedentCalculation';
import { fetchPrecedentWorkspace } from '../services/precedentService';

export const handlePrecedentWorkspace = async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').trim();
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required.' });
  }

  try {
    const workspace = await fetchPrecedentWorkspace(ticker);
    return res.json(workspace);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch precedent transaction workspace.',
    });
  }
};

export const handlePrecedentValuation = (req: Request, res: Response) => {
  const body = req.body as Partial<PrecedentValuationPayload>;

  if (!body.target || !Array.isArray(body.transactions)) {
    return res.status(400).json({ error: 'Target company and transaction comps are required.' });
  }

  try {
    const output = calculatePrecedentValuation({
      target: body.target,
      transactions: body.transactions,
      filters: body.filters,
    });
    return res.json(output);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to calculate precedent transaction valuation.',
    });
  }
};
