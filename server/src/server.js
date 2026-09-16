import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { Application } from './models/Application.js';
import { startAnalysisWorker } from './services/analysis.queue.js';
import { seedStatusHistory } from './utils/funnel.js';

async function backfillStatusHistory() {
  const rows = await Application.find({
    $or: [{ statusHistory: { $exists: false } }, { statusHistory: { $size: 0 } }]
  });
  for (const row of rows) {
    row.statusHistory = seedStatusHistory(row);
    await row.save();
  }
  if (rows.length) console.log(`Backfilled status history for ${rows.length} applications`);
}

const port = Number(process.env.PORT || 3001);
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
await mongoose.connect(process.env.MONGODB_URI);
console.log('MongoDB connected');
await backfillStatusHistory();
await startAnalysisWorker();
createApp().listen(port, '0.0.0.0', () => {
  console.log(`API listening on http://127.0.0.1:${port}`);
});
