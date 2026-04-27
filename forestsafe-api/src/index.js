import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import reportsRouter from './routes/reports.js';
import authRouter from './routes/auth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (allowedOrigins.some((o) => o === '*')) return cb(null, true);
    if (allowedOrigins.some((o) => origin.endsWith('.vercel.app') && o.endsWith('.vercel.app'))) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
}));
app.use(express.json());

// Serve uploaded files as static assets
app.use('/uploads', express.static(uploadsDir));

app.use('/api/reports', reportsRouter);
app.use('/api/auth', authRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`ForestSafe API running on http://localhost:${PORT}`);
});
