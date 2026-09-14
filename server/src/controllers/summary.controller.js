import { unlink } from 'node:fs/promises';
import { Application } from '../models/Application.js';
import { analyzeJob } from '../services/ollama.service.js';
import { renderSummary } from '../services/summary.service.js';
import { saveSummaryFile } from '../services/file.service.js';
import { buildSummaryFilename } from '../utils/sanitizeFilename.js';
import { normalizeJobUrl } from '../utils/normalizeUrl.js';

function filePayload(application) {
  return {
    name: application.fileName,
    downloadUrl: `/api/applications/${application._id}/download`
  };
}

export async function createSummary(req, res, next) {
  let writtenPath;
  try {
    const { url, pageText } = req.body ?? {};
    if (!url || !pageText || pageText.trim().length < 100) {
      return res.status(400).json({ error: 'url and a meaningful pageText are required' });
    }

    const jobUrl = normalizeJobUrl(url);
    const existing = await Application.findOne({ jobUrl });
    if (existing) {
      return res.status(409).json({
        error: 'This job URL is already saved',
        application: existing,
        file: filePayload(existing)
      });
    }

    const analyzed = await analyzeJob({ pageText: pageText.slice(0, 12000), jobUrl });
    const requestedName = buildSummaryFilename(analyzed.company, analyzed.jobTitle);
    const summary = renderSummary(analyzed);
    const saved = await saveSummaryFile(requestedName, summary);
    writtenPath = saved.fullPath;

    const application = await Application.create({
      jobTitle: analyzed.jobTitle,
      company: analyzed.company,
      jobUrl,
      fileName: saved.fileName,
      filePath: saved.fullPath,
      status: 'applied',
      appliedDate: new Date(),
      compensation: analyzed.compensation,
      location: analyzed.location,
      jobType: analyzed.jobType,
      primaryLanguage: analyzed.primaryLanguage,
      primaryTechnology: analyzed.primaryTechnology,
      requiredSkills: analyzed.requiredSkills,
      preferredSkills: analyzed.preferredSkills,
      companyFounded: analyzed.companyFounded,
      approximateEmployeeCount: analyzed.approximateEmployeeCount,
      companySummary: analyzed.companySummary,
      sourceText: pageText
    });

    res.status(201).json({
      success: true,
      application,
      file: filePayload(application),
      summary
    });
  } catch (error) {
    if (writtenPath) await unlink(writtenPath).catch(() => {});
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
