import { unlink } from 'node:fs/promises';
import { Application } from '../models/Application.js';
import { renameSummaryFile } from '../services/file.service.js';
import { buildSummaryFilename } from '../utils/sanitizeFilename.js';

const allowedStatuses = new Set(['applied', 'intro', 'tech', 'offer']);

export async function listApplications(req, res, next) {
  try {
    const { q = '', status = '' } = req.query;
    const filter = {};
    if (status && allowedStatuses.has(status)) filter.status = status;
    if (q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = { $regex: escaped, $options: 'i' };
      filter.$or = [
        { jobTitle: rx },
        { company: rx },
        { primaryTechnology: rx },
        { primaryLanguage: rx },
        { location: rx },
        { jobUrl: rx },
        { fileName: rx },
        { companySummary: rx }
      ];
    }
    const rows = await Application.find(filter).sort({ appliedDate: -1, createdAt: -1 });
    res.json(rows);
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

    const changes = {};
    for (const key of ['jobTitle', 'company', 'status', 'appliedDate']) {
      if (req.body?.[key] !== undefined) changes[key] = req.body[key];
    }
    if (changes.status && !allowedStatuses.has(changes.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (changes.appliedDate) {
      const parsed = new Date(changes.appliedDate);
      if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid applied date' });
      changes.appliedDate = parsed;
    }

    Object.assign(row, changes);

    const nextName = buildSummaryFilename(row.company, row.jobTitle);
    if (nextName !== row.fileName && (changes.jobTitle || changes.company)) {
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
    const row = await Application.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found' });
    await unlink(row.filePath).catch(() => {});
    res.status(204).end();
  } catch (error) { next(error); }
}

export async function downloadSummary(req, res, next) {
  try {
    const row = await Application.findById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found' });
    res.download(row.filePath, row.fileName);
  } catch (error) { next(error); }
}
