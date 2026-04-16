/**
 * Run this once to create / upgrade the database schema:
 *   node src/db/migrate.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure the data directory exists
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sql = `
  -- ── Reports ────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS reports (
    id              TEXT    PRIMARY KEY,
    tracking_code   TEXT    NOT NULL UNIQUE,
    type            TEXT    NOT NULL,
    urgency         TEXT    NOT NULL DEFAULT 'low',
    description     TEXT,
    location_lat    REAL,
    location_lng    REAL,
    location_name   TEXT,
    photo_url       TEXT,
    status          TEXT    NOT NULL DEFAULT 'pending',
    reporter_name   TEXT    NOT NULL,
    reporter_id     TEXT    NOT NULL,
    assigned_to     TEXT,
    resolution_notes TEXT,
    resolved_at     TEXT,
    channel         TEXT    NOT NULL DEFAULT 'web',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_reports_created_at   ON reports (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_tracking     ON reports (tracking_code);
  CREATE INDEX IF NOT EXISTS idx_reports_reporter_id  ON reports (reporter_id);
  CREATE INDEX IF NOT EXISTS idx_reports_status       ON reports (status);
  CREATE INDEX IF NOT EXISTS idx_reports_type         ON reports (type);

  -- ── Users (admin/staff only) ───────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT    PRIMARY KEY,
    username    TEXT    NOT NULL UNIQUE,
    full_name   TEXT    NOT NULL,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff','superadmin')),
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

  -- ── Audit log ──────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id   TEXT    NOT NULL,
    action      TEXT    NOT NULL,
    performed_by TEXT,
    details     TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES reports(id)
  );

  CREATE INDEX IF NOT EXISTS idx_audit_report ON audit_log (report_id);
`;

try {
  db.exec(sql);

  // Seed a default admin account if none exists
  const adminExists = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('admin');
  if (!adminExists) {
    const { v4: uuidv4 } = await import('uuid');
    const hash = bcrypt.hashSync('forestsafe2026', 10);
    db.prepare(
      'INSERT INTO users (id, username, full_name, password, role) VALUES (?, ?, ?, ?, ?)'
    ).run(uuidv4(), 'admin', 'System Admin', hash, 'admin');
    console.log('✓ Default admin account created (username: admin, password: forestsafe2026)');
  }

  console.log('✓ Database migrated successfully (SQLite).');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}
