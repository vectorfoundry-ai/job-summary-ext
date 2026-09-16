import { Router } from 'express';
import { analysisOverview, cancelApplicationAnalysis, deleteApplication, downloadSummary, getApplication, listApplications, retryAnalysis, updateApplication } from '../controllers/application.controller.js';

const router = Router();
router.get('/', listApplications);
router.get('/analysis-overview', analysisOverview);
router.get('/:id/download', downloadSummary);
router.post('/:id/retry', retryAnalysis);
router.post('/:id/cancel', cancelApplicationAnalysis);
router.get('/:id', getApplication);
router.patch('/:id', updateApplication);
router.delete('/:id', deleteApplication);
export default router;
