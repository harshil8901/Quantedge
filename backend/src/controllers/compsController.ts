import { Request, Response } from 'express';
import { calculateComps, CompsInputs } from '../calculations/compsCalculation';

export const handleComps = (req: Request, res: Response) => {
  const payload = req.body as Partial<CompsInputs>;
  const inputs: CompsInputs = {
    revenue: payload.revenue ?? 0,
    ebitda: payload.ebitda ?? 0,
    netIncome: payload.netIncome ?? 0,
    sharePrice: payload.sharePrice ?? 0,
    enterpriseValue: payload.enterpriseValue ?? 0,
    peerMultiple: payload.peerMultiple ?? 0,
    peerMultiples: payload.peerMultiples,
    sharesOutstanding: payload.sharesOutstanding,
  };

  const output = calculateComps(inputs);
  return res.json(output);
};
