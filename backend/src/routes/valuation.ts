import express from 'express';
import { handleCompanyLookup, handleDCF, handleMarketIndices, handleMarketMovers, handleMarketNews } from '../controllers/dcfController';
import { handleComps, handleCompsPeerLookup, handleCompsWorkspace } from '../controllers/compsController';
import { handleDDM, handleDDMWorkspace } from '../controllers/ddmController';

const router = express.Router();

router.post('/dcf', handleDCF);
router.post('/comps', handleComps);
router.get('/comps/peer/:ticker', handleCompsPeerLookup);
router.get('/comps/:ticker', handleCompsWorkspace);
router.get('/company/dividend/:ticker', handleDDMWorkspace);
router.post('/ddm', handleDDM);
router.get('/company/:ticker', handleCompanyLookup);
router.get('/market/movers', handleMarketMovers);
router.get('/market/indices', handleMarketIndices);
router.get('/market/news', handleMarketNews);

export default router;