import { Application } from '../models/Application.js';
import { analyzeJob } from './ollama.service.js';
import { renderSummary } from './summary.service.js';
import { saveSummaryFile } from './file.service.js';
import { buildSummaryFilename } from '../utils/sanitizeFilename.js';

const controllers = new Map();
let pumping = false;

export function enqueueAnalysis() {
  pump();
}

export async function startAnalysisWorker() {
  await Application.updateMany(
    { analysisStatus: 'running' },
    { $set: { analysisStatus: 'queued' } }
  );
  pump();
}

export async function cancelAnalysis(id) {
  const row = await Application.findById(id);
  if (!row) return null;
  if (!['queued', 'running'].includes(row.analysisStatus || '')) return row;
  row.analysisGeneration = (row.analysisGeneration || 0) + 1;
  row.analysisStatus = 'stopped';
  row.analysisError = 'Stopped.';
  await row.save();
  controllers.get(String(id))?.abort();
  return row;
}

export async function queueApplication(id) {
  const row = await Application.findById(id).select('+sourceText');
  if (!row) return null;
  if (!row.sourceText || row.sourceText.trim().length < 100) {
    const error = new Error('No saved job text to analyze. Capture the page again.');
    error.status = 400;
    throw error;
  }
  if (row.analysisStatus === 'queued' || row.analysisStatus === 'running') {
    return Application.findById(id);
  }
  row.analysisStatus = 'queued';
  row.analysisError = '';
  await row.save();
  enqueueAnalysis();
  return Application.findById(id);
}

async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    while (true) {
      const next = await Application.findOne({ analysisStatus: 'queued' })
        .sort({ createdAt: 1 })
        .select('+sourceText');
      if (!next) break;
      await processOne(next);
    }
  } finally {
    pumping = false;
    const more = await Application.exists({ analysisStatus: 'queued' });
    if (more) pump();
  }
}

async function processOne(row) {
  const id = String(row._id);
  const generation = (row.analysisGeneration || 0) + 1;
  row.analysisGeneration = generation;
  row.analysisStatus = 'running';
  row.analysisError = '';
  await row.save();

  const controller = new AbortController();
  controllers.set(id, controller);

  try {
    const analyzed = await analyzeJob({
      pageText: String(row.sourceText || '').slice(0, 12000),
      jobUrl: row.jobUrl,
      signal: controller.signal
    });

    const current = await Application.findById(row._id);
    if (!current || current.analysisGeneration !== generation) return;

    const requestedName = buildSummaryFilename(analyzed.company, analyzed.jobTitle);
    const summary = renderSummary(analyzed);
    const saved = await saveSummaryFile(requestedName, summary);

    current.jobTitle = analyzed.jobTitle;
    current.company = analyzed.company;
    current.fileName = saved.fileName;
    current.filePath = saved.fullPath;
    current.compensation = analyzed.compensation;
    current.location = analyzed.location;
    current.jobType = analyzed.jobType;
    current.primaryTechnology = analyzed.requiredSkills[0] || 'Not specified';
    current.requiredSkills = analyzed.requiredSkills;
    current.softSkills = analyzed.softSkills;
    current.preferredSkills = analyzed.preferredSkills;
    current.companyFounded = analyzed.companyFounded;
    current.approximateEmployeeCount = analyzed.approximateEmployeeCount;
    current.companySummary = analyzed.companySummary;
    current.analysisStatus = 'ready';
    current.analysisError = '';
    current.analyzedAt = new Date();
    await current.save();
  } catch (error) {
    if (error.name === 'AbortError') return;
    await Application.updateOne(
      { _id: row._id, analysisGeneration: generation },
      {
        $set: {
          analysisStatus: 'error',
          analysisError: error.message || 'Ollama analysis failed'
        }
      }
    );
    console.error(`Analysis failed for ${id}:`, error.message);
  } finally {
    controllers.delete(id);
  }
}
