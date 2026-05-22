import { Request, Response } from 'express';
import { calculateLBOValuation, LBOValuationPayload } from '../calculations/lboCalculation';
import { fetchLBOWorkspace } from '../services/lboService';

export const handleLBOWorkspace = async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').trim();
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required.' });
  }

  try {
    const workspace = await fetchLBOWorkspace(ticker);
    return res.json(workspace);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch LBO workspace.',
    });
  }
};

export const handleLBOValuation = (req: Request, res: Response) => {
  const body = req.body as Partial<LBOValuationPayload>;

  if (!body.company || !body.assumptions) {
    return res.status(400).json({ error: 'Company data and LBO assumptions are required.' });
  }

  try {
    const output = calculateLBOValuation({
      company: body.company,
      assumptions: body.assumptions,
      scenarioOverrides: body.scenarioOverrides,
    });
    return res.json(output);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to calculate LBO valuation.',
    });
  }
};
