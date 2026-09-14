import { Router } from 'express';
import { createSummary } from '../controllers/summary.controller.js';
const router = Router();
router.post('/', createSummary);
export default router;
