import { Router } from 'express';
import { overview } from '../controllers/analytics.controller.js';
const router = Router();
router.get('/overview', overview);
export default router;
