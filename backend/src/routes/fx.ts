import express from 'express';
import { handleFxConvert, handleFxRates } from '../controllers/fxController';

const router = express.Router();

router.get('/rates', handleFxRates);
router.post('/convert', handleFxConvert);

export default router;
