import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { startAnalysisWorker } from './services/analysis.queue.js';

const port = Number(process.env.PORT || 3001);
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
await mongoose.connect(process.env.MONGODB_URI);
console.log('MongoDB connected');
await startAnalysisWorker();
createApp().listen(port, '0.0.0.0', () => {
  console.log(`API listening on http://127.0.0.1:${port}`);
});
