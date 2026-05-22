import express from 'express';
import { handlePrecedentWorkspace } from '../controllers/precedentController';

const router = express.Router();

router.get('/:ticker', handlePrecedentWorkspace);

export default router;
