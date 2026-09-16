import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  jobTitle: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  jobUrl: { type: String, required: true, trim: true },
  fileName: { type: String, default: '' },
  filePath: { type: String, default: '' },
  status: {
    type: String,
    enum: ['applied', 'intro', 'tech', 'offer', 'started'],
    default: 'applied'
  },
  notes: { type: String, default: '', trim: true },
  statusHistory: {
    type: [{
      from: { type: String, default: '' },
      to: { type: String, required: true },
      at: { type: Date, default: Date.now }
    }],
    default: []
  },
  appliedDate: { type: Date, default: Date.now },
  compensation: { type: String, default: 'Not specified' },
  location: { type: String, default: 'Not specified' },
  jobType: { type: String, default: 'Not specified' },
  primaryLanguage: { type: String, default: 'Not specified' },
  primaryTechnology: { type: String, default: 'Not specified' },
  requiredSkills: { type: [String], default: [] },
  preferredSkills: { type: [String], default: [] },
  companyFounded: { type: String, default: 'Not specified' },
  approximateEmployeeCount: { type: String, default: 'Not specified' },
  companySummary: { type: String, default: '' },
  sourceText: { type: String, select: false },
  analysisStatus: {
    type: String,
    enum: ['queued', 'running', 'ready', 'error', 'stopped'],
    default: 'ready'
  },
  analysisError: { type: String, default: '' },
  analysisGeneration: { type: Number, default: 0 },
  analyzedAt: { type: Date }
}, { timestamps: true });

applicationSchema.index({ jobUrl: 1 }, { unique: true });
applicationSchema.index({ company: 1, jobTitle: 1 });
applicationSchema.index({ appliedDate: -1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ analysisStatus: 1, createdAt: 1 });

export const Application = mongoose.model('Application', applicationSchema);
