import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// ── Rate limiting (in-memory) ─────────────────────────────────────────────────

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;
const rateBuckets = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  if (!rateBuckets.has(ip)) rateBuckets.set(ip, []);
  const timestamps = rateBuckets.get(ip).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_MAX) {
    return res.status(429).json({ error: 'Too many reports. Please wait before submitting again.' });
  }
  timestamps.push(now);
  rateBuckets.set(ip, timestamps);
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateBuckets) {
    const valid = timestamps.filter((ts) => now - ts < RATE_WINDOW_MS);
    if (valid.length === 0) rateBuckets.delete(ip);
    else rateBuckets.set(ip, valid);
  }
}, 30 * 60 * 1000);

// ── File upload config ────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── Tracking code generator ───────────────────────────────────────────────────

function generateTrackingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  let code = 'FS-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── Prepared statements ───────────────────────────────────────────────────────

const stmts = {
  getAll: db.prepare('SELECT * FROM reports ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM reports WHERE id = ?'),
  getByTracking: db.prepare('SELECT * FROM reports WHERE tracking_code = ?'),
  getByReporterId: db.prepare('SELECT * FROM reports WHERE reporter_id = ? ORDER BY created_at DESC'),
  trackingExists: db.prepare('SELECT 1 FROM reports WHERE tracking_code = ?'),
  insert: db.prepare(`
    INSERT INTO reports (id, tracking_code, type, urgency, description, location_lat, location_lng, location_name, photo_url, status, reporter_name, reporter_id, channel, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateStatus: db.prepare('UPDATE reports SET status = ? WHERE id = ?'),
  assignReport: db.prepare('UPDATE reports SET assigned_to = ? WHERE id = ?'),
  resolveReport: db.prepare('UPDATE reports SET status = ?, resolution_notes = ?, resolved_at = ?, assigned_to = COALESCE(?, assigned_to) WHERE id = ?'),
  insertAudit: db.prepare('INSERT INTO audit_log (report_id, action, performed_by, details) VALUES (?, ?, ?, ?)'),
  getAuditForReport: db.prepare('SELECT * FROM audit_log WHERE report_id = ? ORDER BY created_at DESC'),
};

// ── Column mapping ────────────────────────────────────────────────────────────

function mapRow(row, includeReporter = false) {
  if (!row) return null;
  const result = {
    id: row.id,
    trackingCode: row.tracking_code,
    type: row.type,
    urgency: row.urgency,
    description: row.description,
    lat: row.location_lat,
    lng: row.location_lng,
    locationName: row.location_name,
    photoUrl: row.photo_url,
    status: row.status,
    assignedTo: row.assigned_to,
    resolutionNotes: row.resolution_notes,
    resolvedAt: row.resolved_at,
    channel: row.channel,
    createdAt: row.created_at,
  };
  if (includeReporter) {
    result.reporterName = row.reporter_name;
    result.reporterId = row.reporter_id;
  }
  return result;
}

/** Public map view — strips PII */
function mapRowPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    urgency: row.urgency,
    description: row.description,
    lat: row.location_lat,
    lng: row.location_lng,
    locationName: row.location_name,
    photoUrl: row.photo_url,
    status: row.status,
    createdAt: row.created_at,
  };
}

// ── Input sanitization ────────────────────────────────────────────────────────

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

// POST /api/reports/upload
router.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

// ── PUBLIC: GET /api/reports (anonymized for map) ─────────────────────────────

router.get('/', (_req, res) => {
  try {
    const rows = stmts.getAll.all();
    res.json(rows.map(mapRowPublic));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUBLIC: POST /api/reports (citizen submission) ────────────────────────────

router.post('/', rateLimit, (req, res) => {
  const { type, urgency, description, lat, lng, locationName, photoUrl, status, createdAt, reporterName, reporterId, channel } = req.body;

  if (!type) return res.status(400).json({ error: '`type` is required' });
  if (!reporterName || !reporterName.trim()) return res.status(400).json({ error: '`reporterName` is required' });
  if (!reporterId || !reporterId.trim()) return res.status(400).json({ error: '`reporterId` is required' });

  try {
    const id = uuidv4();

    // Generate unique tracking code
    let trackingCode;
    do {
      trackingCode = generateTrackingCode();
    } while (stmts.trackingExists.get(trackingCode));

    stmts.insert.run(
      id,
      trackingCode,
      sanitize(type),
      urgency ?? 'low',
      sanitize(description) ?? null,
      lat ?? null,
      lng ?? null,
      sanitize(locationName) ?? null,
      photoUrl ?? null,
      status ?? 'pending',
      sanitize(reporterName).trim(),
      sanitize(reporterId).trim(),
      sanitize(channel) ?? 'web',
      createdAt ?? new Date().toISOString(),
    );

    stmts.insertAudit.run(id, 'created', null, `Report submitted by citizen via ${channel || 'web'}`);

    const row = stmts.getById.get(id);
    res.status(201).json(mapRow(row, true));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUBLIC: POST /api/reports/track (citizen lookup) ──────────────────────────

router.post('/track', (req, res) => {
  const { reporterId, trackingCode } = req.body;

  try {
    if (trackingCode && trackingCode.trim()) {
      // Lookup by tracking code
      const row = stmts.getByTracking.get(sanitize(trackingCode).trim().toUpperCase());
      if (!row) return res.status(404).json({ error: 'No report found with that tracking code' });
      return res.json([mapRow(row, false)]);
    }

    if (reporterId && reporterId.trim()) {
      // Lookup by reporter ID number
      const rows = stmts.getByReporterId.all(sanitize(reporterId).trim());
      if (rows.length === 0) return res.status(404).json({ error: 'No reports found for that ID' });
      return res.json(rows.map((r) => mapRow(r, false)));
    }

    return res.status(400).json({ error: 'Provide either `reporterId` or `trackingCode`' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUBLIC: GET /api/reports/:id ──────────────────────────────────────────────

router.get('/:id', (req, res) => {
  try {
    const row = stmts.getById.get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Report not found' });
    res.json(mapRowPublic(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES (require authentication)
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/reports/admin/all ────────────────────────────────────────────────

router.get('/admin/all', requireAuth, requireRole('admin', 'staff', 'superadmin'), (_req, res) => {
  try {
    const rows = stmts.getAll.all();
    res.json(rows.map((r) => mapRow(r, true)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports/admin/:id ────────────────────────────────────────────────

router.get('/admin/:id', requireAuth, requireRole('admin', 'staff', 'superadmin'), (req, res) => {
  try {
    const row = stmts.getById.get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Report not found' });

    const audit = stmts.getAuditForReport.all(req.params.id);
    const report = mapRow(row, true);
    report.auditLog = audit.map((a) => ({
      id: a.id,
      action: a.action,
      performedBy: a.performed_by,
      details: a.details,
      createdAt: a.created_at,
    }));

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/reports/admin/:id/status ───────────────────────────────────────

router.patch('/admin/:id/status', requireAuth, requireRole('admin', 'staff', 'superadmin'), (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: '`status` is required' });

  try {
    const result = stmts.updateStatus.run(status, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Report not found' });

    stmts.insertAudit.run(req.params.id, 'status_change', req.user.username, `Status changed to ${status}`);

    const row = stmts.getById.get(req.params.id);
    res.json(mapRow(row, true));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/reports/admin/:id/assign ───────────────────────────────────────

router.patch('/admin/:id/assign', requireAuth, requireRole('admin', 'superadmin'), (req, res) => {
  const { assignedTo } = req.body;
  if (!assignedTo) return res.status(400).json({ error: '`assignedTo` is required' });

  try {
    const result = stmts.assignReport.run(assignedTo, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Report not found' });

    stmts.insertAudit.run(req.params.id, 'assigned', req.user.username, `Assigned to ${assignedTo}`);

    const row = stmts.getById.get(req.params.id);
    res.json(mapRow(row, true));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/reports/admin/:id/resolve ──────────────────────────────────────

router.patch('/admin/:id/resolve', requireAuth, requireRole('admin', 'staff', 'superadmin'), (req, res) => {
  const { resolutionNotes, assignedTo } = req.body;

  try {
    const result = stmts.resolveReport.run(
      'resolved',
      sanitize(resolutionNotes) || null,
      new Date().toISOString(),
      assignedTo || null,
      req.params.id,
    );
    if (result.changes === 0) return res.status(404).json({ error: 'Report not found' });

    stmts.insertAudit.run(
      req.params.id,
      'resolved',
      req.user.username,
      resolutionNotes ? `Resolved: ${sanitize(resolutionNotes)}` : 'Resolved',
    );

    const row = stmts.getById.get(req.params.id);
    res.json(mapRow(row, true));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LEGACY: PATCH /api/reports/:id/status (keep for offline sync compat) ──────

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: '`status` is required' });

  try {
    const result = stmts.updateStatus.run(status, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Report not found' });
    const row = stmts.getById.get(req.params.id);
    res.json(mapRowPublic(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
