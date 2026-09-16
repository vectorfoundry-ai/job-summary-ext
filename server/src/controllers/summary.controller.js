import { Application } from '../models/Application.js';
import { enqueueAnalysis } from '../services/analysis.queue.js';
import { normalizeJobUrl } from '../utils/normalizeUrl.js';
import { placeholderCompany, placeholderTitle } from '../utils/placeholders.js';

function filePayload(application) {
  return {
    name: application.fileName,
    downloadUrl: application._id ? `/api/applications/${application._id}/download` : ''
  };
}

export async function createSummary(req, res, next) {
  try {
    const { url, pageText, pageTitle } = req.body ?? {};
    if (!url || !pageText || pageText.trim().length < 100) {
      return res.status(400).json({ error: 'url and a meaningful pageText are required' });
    }

    const jobUrl = normalizeJobUrl(url);
    const existing = await Application.findOne({ jobUrl });
    if (existing) {
      return res.status(409).json({
        error: existing.analysisStatus === 'error'
          ? 'This job URL is already saved, but analysis failed. Retry it from the dashboard.'
          : existing.analysisStatus === 'queued' || existing.analysisStatus === 'running'
            ? 'This job URL is already queued for analysis'
            : 'This job URL is already saved',
        application: existing,
        file: filePayload(existing)
      });
    }

    const application = await Application.create({
      jobTitle: placeholderTitle(pageTitle, jobUrl),
      company: placeholderCompany(jobUrl),
      jobUrl,
      fileName: '',
      filePath: '',
      status: 'applied',
      appliedDate: new Date(),
      statusHistory: [{ from: '', to: 'applied', at: new Date() }],
      sourceText: pageText,
      analysisStatus: 'queued',
      analysisError: ''
    });

    enqueueAnalysis();

    res.status(202).json({
      success: true,
      queued: true,
      application,
      file: filePayload(application)
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await Application.findOne({ jobUrl: normalizeJobUrl(req.body?.url) });
      if (duplicate) {
        return res.status(409).json({
          error: 'This job has already been saved',
          application: duplicate,
          file: filePayload(duplicate)
        });
      }
      return res.status(409).json({ error: 'This job has already been saved' });
    }
    next(error);
  }
}
