import express from 'express';
import { handleLBOWorkspace } from '../controllers/lboController';
import { handleSOTPWorkspace } from '../controllers/sotpController';
import { handleEVAWorkspace } from '../controllers/evaController';

const router = express.Router();

router.get('/lbo/:ticker', handleLBOWorkspace);
router.get('/sotp/:ticker', handleSOTPWorkspace);
router.get('/eva/:ticker', handleEVAWorkspace);

export default router;
