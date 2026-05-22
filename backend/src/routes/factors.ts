import express from 'express';
import { handleFactorCalculate, handleFactorUniverses } from '../controllers/factorController';

const router = express.Router();

router.get('/universe', handleFactorUniverses);
router.post('/calculate', handleFactorCalculate);

export default router;
