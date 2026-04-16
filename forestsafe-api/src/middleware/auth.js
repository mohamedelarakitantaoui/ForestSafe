import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'forestsafe-dev-secret-change-in-production';
const JWT_EXPIRES = '8h';
const REFRESH_EXPIRES = '7d';

export { JWT_SECRET, JWT_EXPIRES, REFRESH_EXPIRES };

/**
 * Express middleware – requires a valid JWT in the Authorization header.
 * Attaches `req.user` with { id, username, role }.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Express middleware – requires the user to have one of the given roles.
 * Must be used AFTER requireAuth.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
