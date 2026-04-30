import { Request, Response } from 'express';
import { calculateDDM, DDMInputs } from '../calculations/ddmCalculation';

export const handleDDM = (req: Request, res: Response) => {
  const payload = req.body as Partial<DDMInputs>;
  const inputs: DDMInputs = {
    dividendPerShare: payload.dividendPerShare ?? 0,
    dividendGrowth: payload.dividendGrowth ?? 0,
    costOfEquity: payload.costOfEquity ?? 0,
  };

  const output = calculateDDM(inputs);
  return res.json(output);
};
