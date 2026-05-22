import { Request, Response } from 'express';
import { calculateRIMValuation, RIMValuationPayload } from '../calculations/rimCalculation';
import { fetchRIMWorkspace } from '../services/rimService';

export const handleRIMWorkspace = async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').trim();
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required.' });
  }

  try {
    const workspace = await fetchRIMWorkspace(ticker);
    return res.json(workspace);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch residual income workspace.',
    });
  }
};

export const handleRIM = (req: Request, res: Response) => {
  const body = req.body as Partial<RIMValuationPayload>;

  if (!body.company || !body.assumptions) {
    return res.status(400).json({ error: 'Company inputs and scenario assumptions are required.' });
  }

  try {
    const output = calculateRIMValuation({
      company: body.company,
      assumptions: body.assumptions,
      historical: body.historical ?? [],
    });
    return res.json(output);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to calculate residual income valuation.',
    });
  }
};
