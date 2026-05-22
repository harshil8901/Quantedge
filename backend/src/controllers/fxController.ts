import { Request, Response } from 'express';
import { convertAmount, getFxRates, SUPPORTED_CURRENCIES } from '../services/fxService';

export const handleFxRates = async (req: Request, res: Response) => {
  const base = String(req.query.base || 'USD').toUpperCase();
  try {
    const snapshot = await getFxRates(base);
    return res.json({ currencies: SUPPORTED_CURRENCIES, ...snapshot });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch FX rates.',
    });
  }
};

export const handleFxConvert = (req: Request, res: Response) => {
  const { amount, from, to, rates, manualRate } = req.body as {
    amount?: number;
    from?: string;
    to?: string;
    rates?: Record<string, number>;
    manualRate?: number;
  };

  if (amount == null || !from || !to) {
    return res.status(400).json({ error: 'amount, from, and to are required.' });
  }

  const converted = convertAmount(Number(amount), from, to, rates ?? { [from]: 1, [to]: 1 }, manualRate);
  return res.json({ amount: Number(amount), from, to, converted, manualRate: manualRate ?? null });
};
