import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { requireAuth, requireRole, JWT_SECRET, JWT_EXPIRES, REFRESH_EXPIRES } from '../middleware/auth.js';

const router = Router();

// ── Prepared statements ───────────────────────────────────────────────────────

const stmts = {
  findByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  findById: db.prepare('SELECT id, username, full_name, role, active, created_at FROM users WHERE id = ?'),
  insert: db.prepare('INSERT INTO users (id, username, full_name, password, role) VALUES (?, ?, ?, ?, ?)'),
  listAll: db.prepare('SELECT id, username, full_name, role, active, created_at FROM users ORDER BY created_at DESC'),
  listStaff: db.prepare("SELECT id, username, full_name, role FROM users WHERE role IN ('staff','admin') AND active = 1 ORDER BY full_name"),
};

function signTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
  return { accessToken, refreshToken };
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    active: !!row.active,
    createdAt: row.created_at,
  };
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = stmts.findByUsername.get(username.trim().toLowerCase());
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const tokens = signTokens(user);
  res.json({ user: mapUser(user), ...tokens });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    if (payload.type !== 'refresh') throw new Error('Not a refresh token');

    const user = stmts.findById.get(payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const tokens = signTokens(user);
    res.json({ user: mapUser(user), ...tokens });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  const user = stmts.findById.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(mapUser(user));
});

// ── POST /api/auth/register (admin-only) ──────────────────────────────────────

router.post('/register', requireAuth, requireRole('admin', 'superadmin'), (req, res) => {
  const { username, fullName, password, role } = req.body;

  if (!username || !fullName || !password) {
    return res.status(400).json({ error: 'username, fullName, and password are required' });
  }

  const validRoles = ['staff', 'admin'];
  const userRole = validRoles.includes(role) ? role : 'staff';

  // Only superadmin can create other admins
  if (userRole === 'admin' && req.user.role !== 'superadmin') {
    // Allow admin to create admin for now (single-tier)
  }

  const existing = stmts.findByUsername.get(username.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  try {
    const id = uuidv4();
    const hash = bcrypt.hashSync(password, 10);
    stmts.insert.run(id, username.trim().toLowerCase(), fullName.trim(), hash, userRole);
    const user = stmts.findById.get(id);
    res.status(201).json(mapUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/users (admin-only) ──────────────────────────────────────────

router.get('/users', requireAuth, requireRole('admin', 'superadmin'), (_req, res) => {
  const rows = stmts.listAll.all();
  res.json(rows.map(mapUser));
});

// ── GET /api/auth/staff (admin-only, for assignment dropdowns) ────────────────

router.get('/staff', requireAuth, requireRole('admin', 'superadmin', 'staff'), (_req, res) => {
  const rows = stmts.listStaff.all();
  res.json(rows.map(mapUser));
});

export default router;
