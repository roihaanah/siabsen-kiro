import { verifyToken } from '../services/jwt.js';

/**
 * Middleware autentikasi: memvalidasi JWT dari header Authorization: Bearer <token>.
 * Bila valid, menaruh payload ke req.user dan melanjutkan.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token autentikasi tidak ada.' });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload; // { kind, id, role, name, email }
    return next();
  } catch {
    return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa.' });
  }
}

/**
 * Middleware otorisasi berbasis role. Pakai setelah requireAuth.
 * Contoh: router.get('/admin', requireAuth, requireRole('admin'), handler)
 */
export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak untuk role ini.' });
    }
    next();
  };
}
