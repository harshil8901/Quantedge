import express from 'express';
import { handleCompanyLookup, handleDCF, handleMarketIndices, handleMarketMovers } from '../controllers/dcfController';
import { handleComps } from '../controllers/compsController';
import { handleDDM } from '../controllers/ddmController';

const router = express.Router();

router.post('/dcf', handleDCF);
router.post('/comps', handleComps);
router.post('/ddm', handleDDM);
router.get('/company/:ticker', handleCompanyLookup);
router.get('/market/movers', handleMarketMovers);
router.get('/market/indices', handleMarketIndices);

export default router;