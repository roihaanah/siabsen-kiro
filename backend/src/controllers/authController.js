import bcrypt from 'bcryptjs';
import { findUserByEmail, findUserByIdentity } from '../models/authModel.js';
import { signToken } from '../services/jwt.js';

// POST /api/auth/login  { email, password }
export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    const user = await findUserByEmail(String(email).trim());

    // Pesan generik agar tidak membocorkan email mana yang terdaftar.
    // Tetap jalankan compare dummy bila user tidak ada untuk mengurangi timing leak.
    const hash = user?.password_hash || '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidin';
    const ok = await bcrypt.compare(String(password), hash);

    if (!user || !user.password_hash || !ok) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const payload = {
      kind: user.kind,
      id: user.id,
      role: user.role,
      name: user.full_name,
      email: user.email,
    };
    const token = signToken(payload);

    return res.json({
      token,
      user: {
        id: user.id,
        kind: user.kind,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (err) {
    return next(err);
  }
}

// GET /api/auth/me  (butuh requireAuth)
export async function me(req, res, next) {
  try {
    const { kind, id } = req.user;
    const profile = await findUserByIdentity(kind, id);
    if (!profile) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }
    return res.json({ user: profile });
  } catch (err) {
    return next(err);
  }
}

// POST /api/auth/logout
// JWT bersifat stateless; logout ditangani di klien dengan menghapus token.
// Endpoint ini disediakan agar klien punya kontrak yang jelas.
export async function logout(_req, res) {
  return res.json({ message: 'Logout berhasil.' });
}
