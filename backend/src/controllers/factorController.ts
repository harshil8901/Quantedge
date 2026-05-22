import { Request, Response } from 'express';
import { FactorTiltKey } from '../calculations/factorCalculation';
import { getFactorUniverses, runFactorEngine } from '../services/factorService';

export const handleFactorUniverses = (_req: Request, res: Response) => {
  try {
    return res.json({ universes: getFactorUniverses() });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list factor universes.',
    });
  }
};

export const handleFactorCalculate = async (req: Request, res: Response) => {
  const universeId = String(req.body?.universeId || '').trim();
  const tilt = String(req.body?.tilt || 'quality') as FactorTiltKey;

  if (!universeId) {
    return res.status(400).json({ error: 'universeId is required.' });
  }

  if (!['quality', 'value', 'momentum'].includes(tilt)) {
    return res.status(400).json({ error: 'tilt must be quality, value, or momentum.' });
  }

  try {
    const result = await runFactorEngine({
      universeId,
      tilt,
      weights: req.body?.weights,
      enabledFactors: req.body?.enabledFactors,
    });
    return res.json({ ...result, universeId });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to calculate factor scores.',
    });
  }
};
