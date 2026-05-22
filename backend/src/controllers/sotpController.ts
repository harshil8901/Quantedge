import { Request, Response } from 'express';
import { calculateSOTPValuation, SOTPValuationPayload } from '../calculations/sotpCalculation';
import { fetchSOTPWorkspace } from '../services/sotpService';

export const handleSOTPWorkspace = async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').trim();
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required.' });
  }

  try {
    const workspace = await fetchSOTPWorkspace(ticker);
    return res.json(workspace);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch SOTP workspace.',
    });
  }
};

export const handleSOTPValuation = (req: Request, res: Response) => {
  const body = req.body as Partial<SOTPValuationPayload>;

  if (!body.company || !Array.isArray(body.segments)) {
    return res.status(400).json({ error: 'Company data and segments are required.' });
  }

  try {
    const output = calculateSOTPValuation({
      company: body.company,
      segments: body.segments,
      assumptions: body.assumptions,
      scenarioModifiers: body.scenarioModifiers,
    });
    return res.json(output);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to calculate SOTP valuation.',
    });
  }
};
