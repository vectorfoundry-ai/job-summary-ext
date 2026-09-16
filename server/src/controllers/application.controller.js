import { unlink } from 'node:fs/promises';
import { Application } from '../models/Application.js';
import { cancelAnalysis, queueApplication } from '../services/analysis.queue.js';
import { renameSummaryFile } from '../services/file.service.js';
import { buildSummaryFilename } from '../utils/sanitizeFilename.js';
import { jobPlatformFromUrl } from '../utils/jobPlatform.js';
import { seedStatusHistory } from '../utils/funnel.js';

const allowedStatuses = new Set(['applied', 'intro', 'tech', 'offer', 'started']);
const allowedAnalysis = new Set(['queued', 'running', 'ready', 'error', 'stopped']);

function parseDayStart(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDayEnd(value) {
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function listApplications(req, res, next) {
  try {
    const { q = '', status = '', analysis = '', platform = '', company = '', from = '', to = '' } = req.query;
    const and = [];
    if (status && allowedStatuses.has(status)) and.push({ status });
    if (String(company).trim()) and.push({ company: String(company).trim() });
    if (analysis === 'ready') {
      and.push({ $or: [{ analysisStatus: 'ready' }, { analysisStatus: { $exists: false } }, { analysisStatus: null }] });
    } else if (analysis && allowedAnalysis.has(analysis)) {
      and.push({ analysisStatus: analysis });
    }
    if (from) {
      const start = parseDayStart(from);
      if (start) and.push({ appliedDate: { $gte: start } });
    }
    if (to) {
      const end = parseDayEnd(to);
      if (end) and.push({ appliedDate: { $lte: end } });
    }
    if (q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = { $regex: escaped, $options: 'i' };
      and.push({
        $or: [
          { jobTitle: rx },
          { company: rx },
          { primaryTechnology: rx },
          { primaryLanguage: rx },
          { requiredSkills: rx },
          { softSkills: rx },
          { preferredSkills: rx },
          { location: rx },
          { jobUrl: rx },
          { fileName: rx },
          { companySummary: rx },
          { notes: rx }
        ]
      });
    }

    const filter = and.length === 1 ? and[0] : and.length ? { $and: and } : {};
    let rows = await Application.find(filter).sort({ appliedDate: -1, createdAt: -1 });
    const platformKey = String(platform).trim();
    if (platformKey) {
      rows = rows.filter((row) => jobPlatformFromUrl(row.jobUrl).domain === platformKey);
    }
    res.json(rows);
  } catch (error) { next(error); }
}

export async function filterOptions(_req, res, next) {
  try {
    const [rows, companies] = await Promise.all([
      Application.find().select('jobUrl').lean(),
      Application.distinct('company')
    ]);
    const platforms = new Map();
    for (const row of rows) {
      const info = jobPlatformFromUrl(row.jobUrl);
      if (!platforms.has(info.domain)) platforms.set(info.domain, info);
    }
    res.json({
      platforms: [...platforms.values()].sort((a, b) => a.name.localeCompare(b.name) || a.domain.localeCompare(b.domain)),
      companies: companies.filter(Boolean).sort((a, b) => a.localeCompare(b))
    });
  } catch (error) { next(error); }
}

export async function getApplication(req, res, next) {
  try {
    const row = await Application.findById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found' });
    res.json(row);
  } catch (error) { next(error); }
}

export async function updateApplication(req, res, next) {
  try {
    const row = await Application.findById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found' });

    const previousStatus = row.status;
    const changes = {};
    for (const key of ['jobTitle', 'company', 'status', 'appliedDate', 'notes']) {
      if (req.body?.[key] !== undefined) changes[key] = req.body[key];
    }
    if (changes.notes !== undefined) changes.notes = String(changes.notes).slice(0, 4000);
    if (changes.status && !allowedStatuses.has(changes.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (changes.appliedDate) {
      const parsed = new Date(changes.appliedDate);
      if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid applied date' });
      changes.appliedDate = parsed;
    }

    if (changes.status && changes.status !== previousStatus) {
      if (!row.statusHistory?.length) {
        row.statusHistory = seedStatusHistory({
          appliedDate: row.appliedDate,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          status: previousStatus
        });
      }
      row.statusHistory.push({ from: previousStatus, to: changes.status, at: new Date() });
    }

    Object.assign(row, changes);

    const nextName = buildSummaryFilename(row.company, row.jobTitle);
    if (row.filePath && nextName !== row.fileName && (changes.jobTitle || changes.company)) {
      try {
        const renamed = await renameSummaryFile(row.filePath, nextName);
        row.fileName = renamed.fileName;
        row.filePath = renamed.fullPath;
      } catch {
        // Keep the previous file if rename fails; metadata still updates.
      }
    }

    await row.save();
    res.json(row);
  } catch (error) { next(error); }
}

export async function deleteApplication(req, res, next) {
  try {
    await cancelAnalysis(req.params.id);
    const row = await Application.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found' });
    if (row.filePath) await unlink(row.filePath).catch(() => {});
    res.status(204).end();
  } catch (error) { next(error); }
}

export async function downloadSummary(req, res, next) {
  try {
    const row = await Application.findById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found' });
    if ((row.analysisStatus || 'ready') !== 'ready' || !row.filePath) {
      return res.status(409).json({ error: 'Summary is not ready yet' });
    }
    res.download(row.filePath, row.fileName);
  } catch (error) { next(error); }
}

export async function retryAnalysis(req, res, next) {
  try {
    const row = await queueApplication(req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found' });
    res.json(row);
  } catch (error) { next(error); }
}

export async function cancelApplicationAnalysis(req, res, next) {
  try {
    const row = await cancelAnalysis(req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found' });
    res.json(row);
  } catch (error) { next(error); }
}

export async function analysisOverview(_req, res, next) {
  try {
    const [queued, running, error, stopped, lastFailed] = await Promise.all([
      Application.countDocuments({ analysisStatus: 'queued' }),
      Application.countDocuments({ analysisStatus: 'running' }),
      Application.countDocuments({ analysisStatus: 'error' }),
      Application.countDocuments({ analysisStatus: 'stopped' }),
      Application.findOne({ analysisStatus: 'error' }).sort({ updatedAt: -1 }).select('analysisError jobTitle company updatedAt')
    ]);
    res.json({
      queued,
      running,
      error,
      stopped,
      lastError: lastFailed?.analysisError || '',
      lastFailedAt: lastFailed?.updatedAt || null,
      lastFailedJob: lastFailed ? `${lastFailed.jobTitle} — ${lastFailed.company}` : ''
    });
  } catch (error) { next(error); }
}
