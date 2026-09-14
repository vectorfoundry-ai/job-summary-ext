import { Router } from 'express';
import { deleteApplication, downloadSummary, getApplication, listApplications, updateApplication } from '../controllers/application.controller.js';

const router = Router();
router.get('/', listApplications);
router.get('/:id/download', downloadSummary);
router.get('/:id', getApplication);
router.patch('/:id', updateApplication);
router.delete('/:id', deleteApplication);
export default router;
