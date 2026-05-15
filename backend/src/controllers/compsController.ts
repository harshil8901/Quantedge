import { Request, Response } from 'express';
import {
  calculateComps,
  calculateCompsValuation,
  CompsInputs,
  CompsValuationPayload,
} from '../calculations/compsCalculation';
import { fetchCompsWorkspace, validatePeerTicker } from '../services/compsService';

export const handleCompsWorkspace = async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').trim();
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required.' });
  }

  const peerOverride = Array.isArray(req.query.peers)
    ? (req.query.peers as string[])
    : typeof req.query.peers === 'string'
      ? req.query.peers.split(',').map((item) => item.trim())
      : undefined;

  try {
    const workspace = await fetchCompsWorkspace(ticker, peerOverride);
    return res.json(workspace);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch comparable company workspace.',
    });
  }
};

export const handleCompsPeerLookup = async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker || '').trim();
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required.' });
  }

  try {
    const peer = await validatePeerTicker(ticker);
    return res.json(peer);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch peer company data.',
    });
  }
};

export const handleComps = (req: Request, res: Response) => {
  const body = req.body as Partial<CompsValuationPayload & CompsInputs>;

  if (body.target && Array.isArray(body.peers)) {
    try {
      const output = calculateCompsValuation({
        target: body.target,
        peers: body.peers,
        selectedMultiple: body.selectedMultiple,
        analystMultiples: body.analystMultiples,
      });
      return res.json(output);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to calculate comparable valuation.',
      });
    }
  }

  const inputs: CompsInputs = {
    revenue: body.revenue ?? 0,
    ebitda: body.ebitda ?? 0,
    netIncome: body.netIncome ?? 0,
    sharePrice: body.sharePrice ?? 0,
    enterpriseValue: body.enterpriseValue ?? 0,
    peerMultiple: body.peerMultiple ?? 0,
    peerMultiples: body.peerMultiples,
    sharesOutstanding: body.sharesOutstanding,
  };

  return res.json(calculateComps(inputs));
};
