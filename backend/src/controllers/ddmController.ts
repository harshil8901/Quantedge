import { Request, Response } from 'express';
import {
  calculateDDM,
  calculateDDMValuation,
  DDMInputs,
  DDMValuationPayload,
} from '../calculations/ddmCalculation';
import { fetchDDMWorkspace } from '../services/ddmService';

export const handleDDMWorkspace = async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').trim();
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required.' });
  }

  try {
    const workspace = await fetchDDMWorkspace(ticker);
    return res.json(workspace);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch dividend discount workspace.',
    });
  }
};

export const handleDDM = (req: Request, res: Response) => {
  const body = req.body as Partial<DDMValuationPayload & DDMInputs>;

  if (body.company && body.assumptions) {
    try {
      const output = calculateDDMValuation({
        company: body.company,
        assumptions: body.assumptions,
        historical: body.historical ?? [],
      });
      return res.json(output);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to calculate dividend discount valuation.',
      });
    }
  }

  const inputs: DDMInputs = {
    dividendPerShare: body.dividendPerShare ?? 0,
    dividendGrowth: body.dividendGrowth ?? 0,
    costOfEquity: body.costOfEquity ?? 0,
  };

  return res.json(calculateDDM(inputs));
};
