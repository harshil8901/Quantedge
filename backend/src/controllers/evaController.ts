import { Request, Response } from 'express';
import { calculateEVAValuation, EVAValuationPayload } from '../calculations/evaCalculation';
import { fetchEVAWorkspace } from '../services/evaService';

export const handleEVAWorkspace = async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').trim();
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required.' });
  }

  try {
    const workspace = await fetchEVAWorkspace(ticker);
    return res.json(workspace);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch EVA workspace.',
    });
  }
};

export const handleEVAValuation = (req: Request, res: Response) => {
  const body = req.body as Partial<EVAValuationPayload>;

  if (!body.company || !body.assumptions) {
    return res.status(400).json({ error: 'Company data and EVA assumptions are required.' });
  }

  try {
    const output = calculateEVAValuation({
      company: body.company,
      assumptions: body.assumptions,
      scenarioModifiers: body.scenarioModifiers,
    });
    return res.json(output);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to calculate EVA valuation.',
    });
  }
};
